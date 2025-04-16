<script setup lang="ts">
import { ref, onMounted, watch, computed, onUnmounted } from 'vue';
import { useDebounceFn } from '@vueuse/core';

const SMOOTHING = 0.0;
const FFT_SIZE = 2048;
const DECIBEL_RANGE = [-80.0, 80.0];

interface Props {
  audioUrl: string;
  width?: number; // Keep for initial container size hint if needed, though ResizeObserver drives it
  height?: number; // Keep for initial container size hint if needed
  margin?: { top: number; right: number; bottom: number; left: number };
  maxFrequency?: number;
  colorScheme?: string[];
  sampleSize?: number;
}

const props = withDefaults(defineProps<Props>(), {
  margin: () => ({ top: 20, right: 20, bottom: 30, left: 50 }),
  maxFrequency: 12000,
  colorScheme: () => ['#ffffff', '#f0f0f0', '#d9d9d9', '#bdbdbd', '#969696', '#737373', '#525252', '#252525', '#000000'],
  sampleSize: 512,
});

// Removed redundant reactive refs for width, height, margin, colorScheme, sampleSize

const canvasRef = ref<HTMLCanvasElement | null>(null);
const spectrogramContainer = ref<HTMLDivElement | null>(null);
const audioBuffer = ref<AudioBuffer | null>(null);
const audioSource = ref<AudioBufferSourceNode | null>(null);
const gainNode = ref<GainNode | null>(null);

const isPlaying = ref(false);
const isLoaded = ref(false);
const isPaused = ref(false);
const startTime = ref(0);
const currentTime = ref(0);
const audioDuration = ref(0);
const spectrogramData = ref<Array<{ time: number, values: Uint8Array }>>([]);

const liveAudioContext = ref<AudioContext | null>(null);
const liveAnalyser = ref<AnalyserNode | null>(null);
let offlineFrequencyBinCount = 0; // Store this from offline analyser

const containerWidth = ref(props.width || 0);
const containerHeight = ref(props.height || 0);
let resizeObserver: ResizeObserver | null = null;

const debouncedRender = useDebounceFn(() => {
  if (isLoaded.value) {
    renderSpectrogram();
  }
}, 150);

// Handle resize
function handleResize() {
  if (!spectrogramContainer.value) return;

  const rect = spectrogramContainer.value.getBoundingClientRect();
  if(!props.width) containerWidth.value = rect.width;
  if(!props.height) containerHeight.value = rect.height;

  if (canvasRef.value) {
    canvasRef.value.width = containerWidth.value;
    canvasRef.value.height = containerHeight.value;
  }

  debouncedRender();
}

// Initialize only live audio context for playback
function initLiveAudio() {
  liveAudioContext.value = new AudioContext();
  gainNode.value = liveAudioContext.value.createGain();
  gainNode.value.gain.value = 0; // Muted by default
  gainNode.value.connect(liveAudioContext.value.destination);
}

// Load audio file and trigger offline processing
async function loadAudio(url: string) {
  if (!liveAudioContext.value) {
    initLiveAudio();
  }

  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    audioBuffer.value = await liveAudioContext.value!.decodeAudioData(arrayBuffer);
    audioDuration.value = audioBuffer.value.duration;

    // Generate spectrogram data using OfflineAudioContext
    await generateSpectrogramDataOffline();

  } catch (error) {
    console.error('Error loading or processing audio:', error);
    isLoaded.value = false;
  }
}

// Process audio offline for speed
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

  // Setup offline nodes
  const offlineAnalyser = offlineCtx.createAnalyser();
  offlineAnalyser.minDecibels = DECIBEL_RANGE[0];
  offlineAnalyser.maxDecibels = DECIBEL_RANGE[1];
  offlineAnalyser.smoothingTimeConstant = SMOOTHING;
  offlineAnalyser.fftSize = FFT_SIZE;
  offlineFrequencyBinCount = offlineAnalyser.frequencyBinCount;

  // Use ScriptProcessor for frame-by-frame analysis in offline context
  const offlineProcessor = offlineCtx.createScriptProcessor(props.sampleSize, 1, 1);

  const offlineSource = offlineCtx.createBufferSource();
  offlineSource.buffer = buffer;

  // Connect nodes for offline processing
  offlineSource.connect(offlineAnalyser);
  offlineAnalyser.connect(offlineProcessor);
  offlineProcessor.connect(offlineCtx.destination);

  const freqData = new Uint8Array(offlineAnalyser.frequencyBinCount);
  const tempSpectrogramData: Array<{ time: number, values: Uint8Array }> = [];
  let processCount = 0;

  offlineProcessor.onaudioprocess = () => {
    const currentSec = (props.sampleSize * processCount) / buffer.sampleRate;
    offlineAnalyser.getByteFrequencyData(freqData);
    tempSpectrogramData.push({
      time: currentSec,
      values: new Uint8Array(freqData)
    });
    processCount++;
  };

  offlineSource.start(0);

  await offlineCtx.startRendering();

  spectrogramData.value = tempSpectrogramData;

  // Initialize the LIVE analyser node now for playback/UI
  if (liveAudioContext.value) {
      liveAnalyser.value = liveAudioContext.value.createAnalyser();
      liveAnalyser.value.fftSize = FFT_SIZE;
      // Configure live analyser similarly if needed for visualization during playback (optional)
      // liveAnalyser.value.minDecibels = DECIBEL_RANGE[0];
      // liveAnalyser.value.maxDecibels = DECIBEL_RANGE[1];
  }

  isLoaded.value = true;
  handleResize();
  renderSpectrogram();
}


// Render the spectrogram on canvas
function renderSpectrogram() {
  if (!canvasRef.value || !spectrogramData.value.length || !liveAudioContext.value) return;

  const ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;

  // Calculate drawable area dimensions
  const drawableWidth = containerWidth.value - props.margin.left - props.margin.right;
  const drawableHeight = containerHeight.value - props.margin.top - props.margin.bottom;

  // Ensure drawable dimensions are positive
  if (drawableWidth <= 0 || drawableHeight <= 0) {
    console.warn("Drawable area has zero or negative dimensions. Check margins and container size.");
    return;
  }

  ctx.clearRect(0, 0, containerWidth.value, containerHeight.value);

  // Clear only the drawable area if needed, or keep full clear and redraw axes
  // ctx.clearRect(props.margin.left, props.margin.top, drawableWidth, drawableHeight);

  let min = 255, max = 0;
  spectrogramData.value.forEach(data => {
    // Consider only relevant frequency bins for min/max calculation
    const nyquist = liveAudioContext.value!.sampleRate / 2;
    // Use props.maxFrequency instead of selectedMaxFreq.value
    const maxBinIndex = Math.min(data.values.length - 1, Math.floor(offlineFrequencyBinCount * props.maxFrequency / nyquist));
    const relevantValues = Array.from(data.values.slice(0, maxBinIndex + 1));
    if (relevantValues.length > 0) {
        const dataMin = Math.min(...relevantValues);
        const dataMax = Math.max(...relevantValues);
        if (dataMin < min) min = dataMin;
        if (dataMax > max) max = dataMax;
    }
  });

  // Adjust min/max slightly for better contrast if needed (optional)
  // min = Math.min(255, min + 10);
  // max = Math.max(0, max - 10);
  const range = Math.max(1, max - min); // Avoid division by zero

  // Calculate dot dimensions based on drawable area
  const dotWidth = drawableWidth / spectrogramData.value.length;
  // Calculate dotHeight based on the number of bins mapped to the drawable height
  const nyquist = liveAudioContext.value.sampleRate / 2;
  const freqPerBin = nyquist / offlineFrequencyBinCount;
  // Use props.maxFrequency instead of selectedMaxFreq.value
  const heightPerHz = drawableHeight / props.maxFrequency;
  const dotHeight = Math.max(1, freqPerBin * heightPerHz); // Ensure at least 1 pixel height

  spectrogramData.value.forEach((data, index) => {
    // Map time index to x coordinate within the drawable area
    const x = props.margin.left + (index / spectrogramData.value.length) * drawableWidth;

    for (let j = 0; j < data.values.length; j++) {
      const freq = getBinFrequency(j, offlineFrequencyBinCount);

      // Skip frequencies above the selected maximum
      // Use props.maxFrequency instead of selectedMaxFreq.value
      if (freq > props.maxFrequency) continue;

      // Map frequency to y coordinate within the drawable area
      // y represents the *top* of the rectangle for this frequency bin
      // Use props.maxFrequency instead of selectedMaxFreq.value
      const y = (containerHeight.value - props.margin.bottom) - (freq / props.maxFrequency * drawableHeight);

      const value = data.values[j];

      // Normalize value within the calculated min/max range
      const normalizedValue = Math.max(0, Math.min(1, (value - min) / range));
      const colorIndex = Math.floor(normalizedValue * (props.colorScheme.length - 1));
      ctx.fillStyle = props.colorScheme[colorIndex];

      // Draw the rectangle, ensuring y coordinate doesn't go above the top margin
      // Use Math.ceil for dotHeight to avoid gaps? Or Math.max(1, ...)
      const rectY = Math.max(props.margin.top, y - dotHeight); // Adjust y to draw upwards correctly
      const rectHeight = Math.min(dotHeight, (containerHeight.value - props.margin.bottom) - rectY); // Clamp height

      // Use Math.ceil for width to avoid gaps? Or Math.max(1, ...)
      ctx.fillRect(x, rectY, Math.max(1, dotWidth), rectHeight);
    }
  });

  // Redraw axes on top of the spectrogram data
  drawAxes();
}

// Draw time and frequency axes
function drawAxes() {
  if (!canvasRef.value || !liveAudioContext.value) return;

  const ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;

  // Save context state
  ctx.save();

  // Clear the margin areas explicitly before drawing axes (optional, depends if renderSpectrogram clears fully)
  // ctx.clearRect(0, 0, containerWidth.value, props.margin.top); // Top margin
  // ctx.clearRect(0, containerHeight.value - props.margin.bottom, containerWidth.value, props.margin.bottom); // Bottom margin
  // ctx.clearRect(0, props.margin.top, props.margin.left, containerHeight.value - props.margin.top - props.margin.bottom); // Left margin
  // ctx.clearRect(containerWidth.value - props.margin.right, props.margin.top, props.margin.right, containerHeight.value - props.margin.top - props.margin.bottom); // Right margin


  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.font = '12px Arial';
  ctx.fillStyle = '#000';

  // --- X-axis (Time) ---
  const xAxisY = containerHeight.value - props.margin.bottom;
  ctx.beginPath();
  ctx.moveTo(props.margin.left, xAxisY);
  ctx.lineTo(containerWidth.value - props.margin.right, xAxisY);
  ctx.stroke();

  // X-axis ticks and labels
  const timeSteps = 5;
  const xAxisDrawableWidth = containerWidth.value - props.margin.left - props.margin.right;
  for (let i = 0; i <= timeSteps; i++) {
    const x = props.margin.left + (xAxisDrawableWidth * (i / timeSteps));
    const time = (audioDuration.value * i / timeSteps).toFixed(1); // Adjust precision if needed

    // Tick mark
    ctx.beginPath();
    ctx.moveTo(x, xAxisY);
    ctx.lineTo(x, xAxisY + 5); // Tick points downwards
    ctx.stroke();

    // Label
    ctx.textAlign = 'center';
    ctx.fillText(`${time}s`, x, xAxisY + 15); // Position label below tick

    // Vertical Grid Line (within drawable area)
    if (i > 0 && i < timeSteps) { // Optionally skip first/last grid line
        ctx.beginPath();
        ctx.strokeStyle = '#e0e0e0'; // Light grey for grid
        ctx.lineWidth = 0.5;
        ctx.moveTo(x, props.margin.top); // Start from top margin
        ctx.lineTo(x, xAxisY); // End at X-axis line
        ctx.stroke();
        ctx.strokeStyle = '#000'; // Reset for axes
        ctx.lineWidth = 1;
    }
  }

  // --- Y-axis (Frequency) ---
  const yAxisX = props.margin.left;
  ctx.beginPath();
  ctx.moveTo(yAxisX, props.margin.top);
  ctx.lineTo(yAxisX, containerHeight.value - props.margin.bottom);
  ctx.stroke();

  // Y-axis ticks and labels
  const freqSteps = 5;
  const yAxisDrawableHeight = containerHeight.value - props.margin.top - props.margin.bottom;
  for (let i = 0; i <= freqSteps; i++) {
    // Calculate y position based on drawable height
    const y = (containerHeight.value - props.margin.bottom) - (yAxisDrawableHeight * (i / freqSteps));
    // Use props.maxFrequency instead of selectedMaxFreq.value
    const freq = (props.maxFrequency * i / freqSteps / 1000).toFixed(1); // Freq in kHz

    // Tick mark
    ctx.beginPath();
    ctx.moveTo(yAxisX, y);
    ctx.lineTo(yAxisX - 5, y); // Tick points leftwards
    ctx.stroke();

    // Label
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle'; // Align text vertically
    ctx.fillText(`${freq}k`, yAxisX - 8, y); // Position label left of tick

    // Horizontal Grid Line (within drawable area)
     if (i > 0 && i < freqSteps) { // Optionally skip first/last grid line
        ctx.beginPath();
        ctx.strokeStyle = '#e0e0e0'; // Light grey for grid
        ctx.lineWidth = 0.5;
        ctx.moveTo(yAxisX, y); // Start from Y-axis line
        ctx.lineTo(containerWidth.value - props.margin.right, y); // End at right margin
        ctx.stroke();
        ctx.strokeStyle = '#000'; // Reset for axes
        ctx.lineWidth = 1;
     }
  }

  // Restore context state
  ctx.restore();
}


// Play the audio using the live context
function playAudio() {
  if (!liveAudioContext.value || !audioBuffer.value || isPlaying.value || !liveAnalyser.value) return;

  if (liveAudioContext.value.state === 'suspended') {
    liveAudioContext.value.resume();
  }

  audioSource.value = liveAudioContext.value.createBufferSource();
  audioSource.value.buffer = audioBuffer.value;

  audioSource.value.connect(liveAnalyser.value);
  liveAnalyser.value.connect(gainNode.value!);

  gainNode.value!.gain.value = 1;

  startTime.value = liveAudioContext.value.currentTime - (isPaused.value ? currentTime.value : 0);
  audioSource.value.start(0, isPaused.value ? currentTime.value : 0);

  isPlaying.value = true;
  isPaused.value = false;

  requestAnimationFrame(updateProgress);
}

// Pause audio playback using the live context
function pauseAudio() {
  if (!liveAudioContext.value || !isPlaying.value || !audioSource.value) return;

  currentTime.value = liveAudioContext.value.currentTime - startTime.value;

  audioSource.value.stop();
  audioSource.value.disconnect();
  audioSource.value = null;

  liveAudioContext.value.suspend();


  isPlaying.value = false;
  isPaused.value = true;
}

// Stop audio playback using the live context
function stopAudio() {
  if (!liveAudioContext.value) return;

  if (audioSource.value) {
      try {
          audioSource.value.stop();
          audioSource.value.disconnect();
      } catch (e) {
          console.warn("Error stopping audio source:", e);
      }
      audioSource.value = null;
  }

  if (liveAudioContext.value.state === 'suspended') {
    liveAudioContext.value.resume();
  }

  isPlaying.value = false;
  isPaused.value = false;
  currentTime.value = 0;
  startTime.value = 0;


  const progressLineElement = document.getElementById('progress-line');
  if (progressLineElement) {
    // Reset position considering the left margin
    progressLineElement.style.left = `${props.margin.left}px`;
  }
}


// Update progress line based on live context time
function updateProgress() {
  if (!isPlaying.value || !liveAudioContext.value) return;

  const elapsed = liveAudioContext.value.currentTime - startTime.value;
  const currentProgressTime = Math.min(elapsed, audioDuration.value);
  const progress = currentProgressTime / audioDuration.value;

  const progressLineElement = document.getElementById('progress-line');
   if (progressLineElement && spectrogramContainer.value) {
    // Calculate position relative to the drawable area
    const drawableWidth = containerWidth.value - props.margin.left - props.margin.right;
    const lineLeft = props.margin.left + (progress * drawableWidth);
    progressLineElement.style.left = `${lineLeft}px`;
  }


  if (currentProgressTime >= audioDuration.value) {
    stopAudio();
    return;
  }

  requestAnimationFrame(updateProgress);
}


// Utility to get frequency from bin index - requires sample rate and bin count
function getBinFrequency(index: number, binCount: number): number {
  if (!liveAudioContext.value || !binCount) return 0;
  const nyquist = liveAudioContext.value.sampleRate / 2;
  return index / binCount * nyquist;
}


// Initialize component
onMounted(() => {
  initLiveAudio();
  loadAudio(props.audioUrl);

  if (spectrogramContainer.value) {
    resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(spectrogramContainer.value);
  }
  window.addEventListener('resize', handleResize);
});

// Clean up when component is unmounted
onUnmounted(() => {
  stopAudio();

  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  window.removeEventListener('resize', handleResize);

  if (liveAudioContext.value) {
    liveAudioContext.value.close().catch(e => console.warn("Error closing AudioContext:", e));
  }
});

// Watch for audioUrl changes to reload
watch(() => props.audioUrl, (newUrl) => {
    if (newUrl) {
        stopAudio();
        isLoaded.value = false;
        spectrogramData.value = [];
        loadAudio(newUrl);
    }
});

</script>

<template>
  <div class="spectrogram-wrapper">
    <div ref="spectrogramContainer" class="spectrogram-container">
      <canvas
        ref="canvasRef"
        class="spectrogram-canvas"
        :width="containerWidth"
        :height="containerHeight"
      />

      <div
        id="progress-line"
        class="progress-line"
        v-show="isLoaded"
        :style="{ left: `${props.margin.left}px` }"
      />

      <div v-if="!isLoaded" class="loading-spinner">
        <div class="spinner" />
        <span>Loading Spectrogram...</span>
      </div>
    </div>

    <div class="controls-container">
       <button
        @click="playAudio"
        :disabled="isPlaying || !isLoaded"
        class="control-button"
      >
        {{ isPaused ? 'Resume' : 'Play' }}
      </button>

      <button
        @click="pauseAudio"
        :disabled="!isPlaying || !isLoaded"
        class="control-button"
      >
       Pause
      </button>

      <button
        @click="stopAudio"
        :disabled="!isPlaying && !isPaused"
        class="control-button"
      >
        Stop
      </button>
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
  display: block;
  position: absolute;
  top: 0;
  left: 0;
}

.controls-container {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  column-gap: 10px;
  width: 100%;
  margin-top: 10px;
}

.control-button {
  padding: 8px 12px;
  background-color: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
}

.control-button:hover:not(:disabled) {
  background-color: #e0e0e0;
}

.control-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.progress-line {
  position: absolute;
  top: 0;
  left: 0;
  width: 2px;
  height: 100%;
  background-color: #a50f15;
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

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
