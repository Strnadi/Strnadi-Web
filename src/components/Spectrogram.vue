<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, computed } from 'vue';
import { useDebounceFn } from '@vueuse/core';

const SMOOTHING = 0.0;
const FFT_SIZE = 2048;
const DECIBEL_RANGE = [-80.0, 80.0];

interface Props {
  audioUrl: string;
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  maxFrequency?: number;
  colorScheme?: string[];
  sampleSize?: number;
}

const props = withDefaults(defineProps<Props>(), {
  margin: () => ({ top: 20, right: 20, bottom: 30, left: 50 }),
  maxFrequency: 12000,
  colorScheme: () => [
    '#ffffff', '#f0f0f0', '#d9d9d9', '#bdbdbd',
    '#969696', '#737373', '#525252', '#252525', '#000000'
  ],
  sampleSize: 512,
});

const canvasRef           = ref<HTMLCanvasElement | null>(null);
const spectrogramContainer= ref<HTMLDivElement | null>(null);
const progressLineRef     = ref<HTMLDivElement | null>(null);
const audioBuffer         = ref<AudioBuffer | null>(null);
const audioSource         = ref<AudioBufferSourceNode | null>(null);
const gainNode            = ref<GainNode | null>(null);

const isPlaying           = ref(false);
const isLoaded            = ref(false);
const isPaused            = ref(false);
const startTime           = ref(0);
const currentTime         = ref(0);
const audioDuration       = ref(0);
const spectrogramData     = ref<{ time: number, values: Uint8Array }[]>([]);

const liveAudioContext    = ref<AudioContext | null>(null);
const liveAnalyser        = ref<AnalyserNode | null>(null);
let offlineFrequencyBinCount = 0;

const containerWidth      = ref(props.width || 0);
const containerHeight     = ref(props.height || 0);
let resizeObserver        : ResizeObserver | null = null;

// ZOOM & PAN state
const zoomLevel    = ref(1);
const offsetIndex  = ref(0);
const windowSize   = ref(0);
const minVisibleCols = 10;
const maxZoomLevel = computed(() => {
  if (!isLoaded.value || !spectrogramData.value.length) return 1;
  return Math.max(1, Math.floor(spectrogramData.value.length / minVisibleCols));
});

// Panning
const isPanning    = ref(false);
let panStartX      = 0;
let panStartOffset = 0;

// Cursor style
const zoomCursor = computed(() => {
  if (isPanning.value) return 'grabbing';
  return zoomLevel.value > 1 ? 'grab' : 'zoom-in';
});

function clamp(val: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, val));
}

const debouncedRender = useDebounceFn(() => {
  if (isLoaded.value) renderSpectrogram();
}, 150);

// Handle resize
function handleResize() {
  if (!spectrogramContainer.value) return;
  const rect = spectrogramContainer.value.getBoundingClientRect();
  if (!props.width)  containerWidth.value  = rect.width;
  if (!props.height) containerHeight.value = rect.height;
  if (canvasRef.value) {
    canvasRef.value.width  = containerWidth.value;
    canvasRef.value.height = containerHeight.value;
  }
  debouncedRender();
}

// Initialize live audio for playback
function initLiveAudio() {
  liveAudioContext.value = new AudioContext();
  gainNode.value = liveAudioContext.value.createGain();
  gainNode.value.gain.value = 0; // start muted
  gainNode.value.connect(liveAudioContext.value.destination);
}

// Load & decode, then do offline spectrogram
async function loadAudio(url: string) {
  if (!liveAudioContext.value) initLiveAudio();
  try {
    const resp = await fetch(url);
    const ab   = await resp.arrayBuffer();
    audioBuffer.value = await liveAudioContext.value!.decodeAudioData(ab);
    audioDuration.value = audioBuffer.value.duration;
    await generateSpectrogramDataOffline();
  } catch (e) {
    console.error('Error loading/processing:', e);
    isLoaded.value = false;
  }
}

async function generateSpectrogramDataOffline() {
  if (!audioBuffer.value) return;
  isLoaded.value = false;
  spectrogramData.value = [];
  const buffer = audioBuffer.value;
  const offlineCtx = new OfflineAudioContext(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate
  );
  const offAnalyser = offlineCtx.createAnalyser();
  offAnalyser.minDecibels = DECIBEL_RANGE[0];
  offAnalyser.maxDecibels = DECIBEL_RANGE[1];
  offAnalyser.smoothingTimeConstant = SMOOTHING;
  offAnalyser.fftSize = FFT_SIZE;
  offlineFrequencyBinCount = offAnalyser.frequencyBinCount;

  const offProc = offlineCtx.createScriptProcessor(props.sampleSize, 1, 1);
  const offSrc  = offlineCtx.createBufferSource();
  offSrc.buffer = buffer;

  offSrc.connect(offAnalyser);
  offAnalyser.connect(offProc);
  offProc.connect(offlineCtx.destination);

  const freqData = new Uint8Array(offAnalyser.frequencyBinCount);
  const tmp: { time: number, values: Uint8Array }[] = [];
  let cnt = 0;
  offProc.onaudioprocess = () => {
    const t = (props.sampleSize * cnt) / buffer.sampleRate;
    offAnalyser.getByteFrequencyData(freqData);
    tmp.push({ time: t, values: new Uint8Array(freqData) });
    cnt++;
  };
  offSrc.start(0);
  await offlineCtx.startRendering();

  spectrogramData.value = tmp;
  // reset zoom window
  offsetIndex.value = 0;
  windowSize.value  = spectrogramData.value.length;
  zoomLevel.value   = 1;

  // init live analyser (for optional real‐time visualizations)
  if (liveAudioContext.value) {
    liveAnalyser.value = liveAudioContext.value.createAnalyser();
    liveAnalyser.value.fftSize = FFT_SIZE;
  }

  isLoaded.value = true;
  handleResize();
  renderSpectrogram();
}

// RENDER
function renderSpectrogram() {
  if (!canvasRef.value || !liveAudioContext.value || !isLoaded.value) return;
  const ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;

  // dimensions
  const dw = containerWidth.value - props.margin.left - props.margin.right;
  const dh = containerHeight.value - props.margin.top  - props.margin.bottom;
  if (dw <= 0 || dh <= 0) return;

  // ensure windowSize
  const totalCols = spectrogramData.value.length;
  if (!windowSize.value) {
    windowSize.value = totalCols;
    offsetIndex.value = 0;
  }

  // compute slice
  const sIdx = offsetIndex.value;
  const eIdx = Math.min(sIdx + windowSize.value, totalCols);
  const dataToRender = spectrogramData.value.slice(sIdx, eIdx);
  const numCols = dataToRender.length;
  if (!numCols) return;

  // find global min/max for color scaling
  let minV = 255, maxV = 0;
  const nyquist = liveAudioContext.value.sampleRate / 2;
  dataToRender.forEach(d => {
    const maxBin = Math.min(
      d.values.length - 1,
      Math.floor(d.values.length * props.maxFrequency / nyquist)
    );
    for (let i = 0; i <= maxBin; i++) {
      const v = d.values[i];
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
  });
  const range = Math.max(1, maxV - minV);

  // size of each "pixel"
  const dotW = dw / numCols;
  const freqPerBin = nyquist / offlineFrequencyBinCount;
  const heightPerHz = dh / props.maxFrequency;
  const dotH = Math.max(1, freqPerBin * heightPerHz);

  ctx.clearRect(0, 0, containerWidth.value, containerHeight.value);

  // draw each column
  dataToRender.forEach((d, xi) => {
    const x = props.margin.left + (xi / numCols) * dw;
    d.values.forEach((val, j) => {
      const freq = getBinFrequency(j, offlineFrequencyBinCount);
      if (freq > props.maxFrequency) return;
      const yTop = (containerHeight.value - props.margin.bottom)
                   - (freq / props.maxFrequency * dh);
      const normalized = clamp((val - minV) / range, 0, 1);
      const colIndex = Math.floor(normalized * (props.colorScheme.length - 1));
      ctx.fillStyle = props.colorScheme[colIndex];
      const rectY = Math.max(props.margin.top, yTop - dotH);
      const rectH = Math.min(dotH,
        (containerHeight.value - props.margin.bottom) - rectY
      );
      ctx.fillRect(x, rectY, Math.max(1, dotW), rectH);
    });
  });

  // draw axes, passing only the visible time window
  const tStart = dataToRender[0].time;
  const tEnd   = dataToRender[numCols - 1].time;
  drawAxes(tStart, tEnd);
}

// Draw axes for a given visible time window
function drawAxes(timeStart: number, timeEnd: number) {
  if (!canvasRef.value) return;
  const ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;
  ctx.save();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.font = '12px Arial';
  ctx.fillStyle = '#000';

  // X‐axis
  const x0 = props.margin.left;
  const x1 = containerWidth.value - props.margin.right;
  const yAxisY = containerHeight.value - props.margin.bottom;
  ctx.beginPath();
  ctx.moveTo(x0, yAxisY);
  ctx.lineTo(x1, yAxisY);
  ctx.stroke();

  const steps = 5;
  const span = timeEnd - timeStart;
  for (let i = 0; i <= steps; i++) {
    const frac = i / steps;
    const x = x0 + frac * (x1 - x0);
    const tickTime = (timeStart + span * frac).toFixed(1);

    // tick
    ctx.beginPath();
    ctx.moveTo(x, yAxisY);
    ctx.lineTo(x, yAxisY + 5);
    ctx.stroke();

    // label
    ctx.textAlign = 'center';
    ctx.fillText(`${tickTime}s`, x, yAxisY + 15);

    // grid
    if (i > 0 && i < steps) {
      ctx.beginPath();
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 0.5;
      ctx.moveTo(x, props.margin.top);
      ctx.lineTo(x, yAxisY);
      ctx.stroke();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
    }
  }

  // Y‐axis
  const y0 = props.margin.top;
  const y1 = containerHeight.value - props.margin.bottom;
  const xAxisX = props.margin.left;
  ctx.beginPath();
  ctx.moveTo(xAxisX, y0);
  ctx.lineTo(xAxisX, y1);
  ctx.stroke();

  const freqSteps = 5;
  for (let i = 0; i <= freqSteps; i++) {
    const frac = i / freqSteps;
    const y = y1 - frac * (y1 - y0);
    const freqLabel = ((props.maxFrequency * frac) / 1000).toFixed(1);

    // tick
    ctx.beginPath();
    ctx.moveTo(xAxisX, y);
    ctx.lineTo(xAxisX - 5, y);
    ctx.stroke();

    // label
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${freqLabel}k`, xAxisX - 8, y);

    // grid
    if (i > 0 && i < freqSteps) {
      ctx.beginPath();
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 0.5;
      ctx.moveTo(xAxisX, y);
      ctx.lineTo(containerWidth.value - props.margin.right, y);
      ctx.stroke();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
    }
  }

  ctx.restore();
}

// PLAYBACK CONTROLS
function playAudio() {
  if (!liveAudioContext.value || !audioBuffer.value || isPlaying.value || !liveAnalyser.value) return;
  if (liveAudioContext.value.state === 'suspended') liveAudioContext.value.resume();

  audioSource.value = liveAudioContext.value.createBufferSource();
  audioSource.value.buffer = audioBuffer.value;
  audioSource.value.connect(liveAnalyser.value);
  liveAnalyser.value.connect(gainNode.value!);
  gainNode.value!.gain.value = 1;

  startTime.value = liveAudioContext.value.currentTime - (isPaused.value ? currentTime.value : 0);
  audioSource.value.start(0, isPaused.value ? currentTime.value : 0);
  isPlaying.value = true;
  isPaused.value  = false;
  requestAnimationFrame(updateProgress);
}

function pauseAudio() {
  if (!liveAudioContext.value || !isPlaying.value || !audioSource.value) return;
  currentTime.value = liveAudioContext.value.currentTime - startTime.value;
  audioSource.value.stop();
  audioSource.value.disconnect();
  liveAudioContext.value.suspend();
  isPlaying.value = false;
  isPaused.value  = true;
}

function stopAudio() {
  if (!liveAudioContext.value) return;
  if (audioSource.value) {
    try {
      audioSource.value.stop();
      audioSource.value.disconnect();
    } catch {}
    audioSource.value = null;
  }
  if (liveAudioContext.value.state === 'suspended') {
    liveAudioContext.value.resume();
  }
  isPlaying.value = false;
  isPaused.value  = false;
  currentTime.value = 0;
  startTime.value   = 0;
  if (progressLineRef.value) {
    progressLineRef.value.style.left = `${props.margin.left}px`;
  }
}

function updateProgress() {
  if (!isPlaying.value || !liveAudioContext.value) return;
  const elapsed = liveAudioContext.value.currentTime - startTime.value;
  const nowTime = Math.min(elapsed, audioDuration.value);

  // reposition the red progress line with respect to the visible window
  const sIdx = offsetIndex.value;
  const eIdx = Math.min(sIdx + windowSize.value, spectrogramData.value.length);
  const t0 = spectrogramData.value[sIdx]?.time || 0;
  const t1 = spectrogramData.value[eIdx - 1]?.time || audioDuration.value;
  const frac = clamp((nowTime - t0) / (t1 - t0), 0, 1);
  const dw = containerWidth.value - props.margin.left - props.margin.right;
  const x = props.margin.left + frac * dw;
  if (progressLineRef.value) progressLineRef.value.style.left = `${x}px`;

  if (elapsed >= audioDuration.value) {
    stopAudio();
    return;
  }
  requestAnimationFrame(updateProgress);
}

// frequency bin → Hz
function getBinFrequency(idx: number, binCount: number) {
  if (!liveAudioContext.value || !binCount) return 0;
  const nyq = liveAudioContext.value.sampleRate / 2;
  return idx / binCount * nyq;
}

// ZOOM & PAN handlers
function updateZoom(newZoom: number, centerFrac = 0.5) {
  if (!isLoaded.value || !spectrogramData.value.length) return;
  const total = spectrogramData.value.length;
  newZoom = clamp(newZoom, 1, maxZoomLevel.value);
  const oldWin = windowSize.value || total;
  const oldOff = offsetIndex.value;
  const actualCenter = oldOff + centerFrac * oldWin;
  if (newZoom <= 1) {
    zoomLevel.value   = 1;
    windowSize.value  = total;
    offsetIndex.value = 0;
  } else {
    zoomLevel.value   = newZoom;
    const newWin = Math.max(1, Math.floor(total / newZoom));
    let newOff = Math.floor(actualCenter - centerFrac * newWin);
    newOff = clamp(newOff, 0, total - newWin);
    windowSize.value  = newWin;
    offsetIndex.value = newOff;
  }
  renderSpectrogram();
}

function onSliderInput(e: Event) {
  const v = Number((e.target as HTMLInputElement).value);
  updateZoom(v, 0.5);
}

function onZoomClick(e: MouseEvent) {
  if (!canvasRef.value || !isLoaded.value) return;
  const r = canvasRef.value.getBoundingClientRect();
  const x = e.clientX - r.left - props.margin.left;
  const dw = containerWidth.value - props.margin.left - props.margin.right;
  const cf = clamp(x / dw, 0, 1);
  if (zoomLevel.value > 1) updateZoom(1, cf);
  else                     updateZoom(2, cf);
}

function onPanStart(e: MouseEvent) {
  if (zoomLevel.value <= 1 || !canvasRef.value) return;
  isPanning.value = true;
  panStartX       = e.clientX;
  panStartOffset  = offsetIndex.value;
  document.addEventListener('mousemove', onPanMove);
  document.addEventListener('mouseup',   onPanEnd);
}

function onPanMove(e: MouseEvent) {
  if (!isPanning.value) return;
  const dx = e.clientX - panStartX;
  const dw = containerWidth.value - props.margin.left - props.margin.right;
  const di = Math.round(-dx / dw * windowSize.value);
  offsetIndex.value = clamp(panStartOffset + di, 0, spectrogramData.value.length - windowSize.value);
  renderSpectrogram();
}

function onPanEnd() {
  isPanning.value = false;
  document.removeEventListener('mousemove', onPanMove);
  document.removeEventListener('mouseup',   onPanEnd);
}

// LIFECYCLE
onMounted(() => {
  initLiveAudio();
  loadAudio(props.audioUrl);
  if (spectrogramContainer.value) {
    resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(spectrogramContainer.value);
  }
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  stopAudio();
  if (resizeObserver) resizeObserver.disconnect();
  window.removeEventListener('resize', handleResize);
  if (liveAudioContext.value) {
    liveAudioContext.value.close().catch(() => {});
  }
});

// reload on URL change
watch(() => props.audioUrl, (u) => {
  if (!u) return;
  stopAudio();
  isLoaded.value = false;
  spectrogramData.value = [];
  loadAudio(u);
});
</script>

<template>
  <div class="spectrogram-wrapper">
    <div
      ref="spectrogramContainer"
      class="spectrogram-container"
    >
      <canvas
        ref="canvasRef"
        class="spectrogram-canvas"
        :width="containerWidth"
        :height="containerHeight"
        :style="{ cursor: zoomCursor }"
        @mousedown="onPanStart"
        @click="onZoomClick"
      />

      <div
        v-show="isLoaded"
        ref="progressLineRef"
        class="progress-line"
        :style="{ left: `${props.margin.left}px` }"
      />

      <div
        v-if="!isLoaded"
        class="loading-spinner"
      >
        <div class="spinner" />
        <span>Loading Spectrogram...</span>
      </div>
    </div>

    <div class="controls-container">
      <button
        :disabled="isPlaying || !isLoaded"
        @click="playAudio"
      >
        {{ isPaused ? 'Resume' : 'Play' }}
      </button>
      <button
        :disabled="!isPlaying || !isLoaded"
        @click="pauseAudio"
      >
        Pause
      </button>
      <button
        :disabled="!isPlaying && !isPaused"
        @click="stopAudio"
      >
        Stop
      </button>
    </div>

    <!-- Zoom slider -->
    <div
      v-if="isLoaded"
      class="slider-container"
    >
      <label>Zoom: {{ zoomLevel }}×</label>
      <input
        type="range"
        :min="1"
        :max="maxZoomLevel"
        :value="zoomLevel"
        step="1"
        @input="onSliderInput"
      >
    </div>
  </div>
</template>

<style scoped>
.spectrogram-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  row-gap: 8px;
  width: 100%;
}

.spectrogram-container {
  position: relative;
  width: 100%;
  height: v-bind("`${containerHeight}px`");
  border: 1px solid #e0e0e0;
  overflow: hidden;
}

.spectrogram-canvas {
  position: absolute;
  top: 0;
  left: 0;
  display: block;
}

.controls-container {
  display: flex;
  justify-content: flex-end;
  column-gap: 10px;
  width: 100%;
  margin-top: 10px;
}

.control-button {
  padding: 8px 12px;
  background: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
}

.control-button:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.control-button:hover:not(:disabled) {
  background: #e0e0e0;
}

.progress-line {
  position: absolute;
  top: 0;
  width: 2px;
  height: 100%;
  background: #a50f15;
  pointer-events: none;
}

.loading-spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: #000;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.slider-container {
  width: 100%;
  display: flex;
  align-items: center;
  column-gap: 10px;
  padding: 0 10px;
}
.slider-container label {
  white-space: nowrap;
}
.slider-container input[type="range"] {
  flex: 1;
}
</style>
