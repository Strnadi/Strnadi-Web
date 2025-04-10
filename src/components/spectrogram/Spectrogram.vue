<script setup lang="ts">
import { ref, onMounted, watch, computed, onUnmounted } from 'vue';

interface SpectrogramOptions {
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  maxFrequency?: number;
  minFrequency?: number;
  colorScheme?: string[];
  sampleSize?: number;
}

interface Props {
  audioUrl: string;
  options?: SpectrogramOptions;
}

const props = withDefaults(defineProps<Props>(), {
  options: () => ({})
});

// Constants
const SMOOTHING = 0.0;
const FFT_SIZE = 2048;
const DEFAULT_WIDTH = 900;
const DEFAULT_HEIGHT = 440;
const DEFAULT_MARGIN = { top: 20, right: 20, bottom: 30, left: 50 };
const DEFAULT_COLOR_SCHEME = ['#ffffff', '#f0f0f0', '#d9d9d9', '#bdbdbd', '#969696', '#737373', '#525252', '#252525', '#000000'];
const DEFAULT_SAMPLE_SIZE = 512;
const DECIBEL_RANGE = [-80.0, 80.0];

// Reactive state
const width = ref(props.options.width || DEFAULT_WIDTH);
const height = ref(props.options.height || DEFAULT_HEIGHT);
const margin = ref(props.options.margin || DEFAULT_MARGIN);
const colorScheme = ref(props.options.colorScheme || DEFAULT_COLOR_SCHEME);
const sampleSize = ref(props.options.sampleSize || DEFAULT_SAMPLE_SIZE);

const canvasRef = ref<HTMLCanvasElement | null>(null);
const spectrogramContainer = ref<HTMLDivElement | null>(null);
const audioContext = ref<AudioContext | null>(null);
const analyser = ref<AnalyserNode | null>(null);
const audioBuffer = ref<AudioBuffer | null>(null);
const audioSource = ref<AudioBufferSourceNode | null>(null);
const gainNode = ref<GainNode | null>(null);
const scriptProcessor = ref<ScriptProcessorNode | null>(null);

const isPlaying = ref(false);
const isLoaded = ref(false);
const isPaused = ref(false);
const startTime = ref(0);
const currentTime = ref(0);
const audioDuration = ref(0);
const spectrogramData = ref<Array<{ time: number, values: Uint8Array }>>([]);
const selectedMaxFreq = ref<number>(22500);

const freqOptions = computed(() => {
  if (!analyser.value) return [];
  
  const options = [];
  for (let i = 64; i < (analyser.value.frequencyBinCount || 0); i += 64) {
    options.push(getBinFrequency(i).toFixed(4));
  }
  return options;
});

// Add debounce function
function debounce(fn: Function, delay: number) {
  let timeoutId: number;
  return function(...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => fn.apply(this, args), delay);
  };
}

// Add responsive dimension handling
const containerWidth = ref(props.options.width || DEFAULT_WIDTH);
const containerHeight = ref(props.options.height || DEFAULT_HEIGHT);
let resizeObserver: ResizeObserver | null = null;

// Debounced render function
const debouncedRender = debounce(() => {
  if (isLoaded.value) {
    renderSpectrogram();
  }
}, 150);

// Handle resize
function handleResize() {
  if (!spectrogramContainer.value) return;
  
  // Get actual container dimensions
  const rect = spectrogramContainer.value.getBoundingClientRect();
  containerWidth.value = rect.width;
  containerHeight.value = rect.height;
  
  // Update canvas dimensions
  if (canvasRef.value) {
    canvasRef.value.width = containerWidth.value;
    canvasRef.value.height = containerHeight.value;
  }
  
  debouncedRender();
}

// Initialize audio context and nodes
function initAudio() {
  audioContext.value = new AudioContext();
  analyser.value = audioContext.value.createAnalyser();
  analyser.value.minDecibels = DECIBEL_RANGE[0];
  analyser.value.maxDecibels = DECIBEL_RANGE[1];
  analyser.value.smoothingTimeConstant = SMOOTHING;
  analyser.value.fftSize = FFT_SIZE;
  
  gainNode.value = audioContext.value.createGain();
  gainNode.value.gain.value = 0; // Muted by default
  
  scriptProcessor.value = audioContext.value.createScriptProcessor(
    sampleSize.value, 1, 1
  );
  
  // Connect audio processing nodes
  analyser.value.connect(gainNode.value);
  gainNode.value.connect(audioContext.value.destination);
  
  loadAudio(props.audioUrl);
}

// Load audio file
async function loadAudio(url: string) {
  if (!audioContext.value) return;
  
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    audioBuffer.value = await audioContext.value.decodeAudioData(arrayBuffer);
    audioDuration.value = audioBuffer.value.duration;
    
    // Now generate the spectrogram data
    generateSpectrogramData();
  } catch (error) {
    console.error('Error loading audio:', error);
  }
}

// Process audio to generate spectrogram data
function generateSpectrogramData() {
  if (!audioContext.value || !audioBuffer.value || !analyser.value) return;
  
  // Set up the audio nodes for processing
  const tempSource = audioContext.value.createBufferSource();
  tempSource.buffer = audioBuffer.value;
  
  // Connect to analyzer for processing
  tempSource.connect(analyser.value);
  
  const freqData = new Uint8Array(analyser.value.frequencyBinCount);
  const maxSamples = Math.ceil((audioContext.value.sampleRate / sampleSize.value) * audioBuffer.value.duration);
  
  let processCount = 0;
  
  // Use script processor to collect frequency data
  scriptProcessor.value!.onaudioprocess = () => {
    if (processCount >= maxSamples) {
      tempSource.stop();
      scriptProcessor.value!.disconnect();
      isLoaded.value = true;
      renderSpectrogram();
      return;
    }
    
    const currentSec = (sampleSize.value * processCount) / audioBuffer.value!.sampleRate;
    analyser.value!.getByteFrequencyData(freqData);
    
    spectrogramData.value.push({
      time: currentSec,
      values: new Uint8Array(freqData) // Clone the data
    });
    
    processCount++;
  };
  
  tempSource.connect(scriptProcessor.value!);
  scriptProcessor.value!.connect(audioContext.value.destination);
  
  tempSource.start(0);
}

// Render the spectrogram on canvas
function renderSpectrogram() {
  if (!canvasRef.value || !spectrogramData.value.length) return;
  
  const ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;
  
  // Clear the canvas using actual dimensions
  ctx.clearRect(0, 0, containerWidth.value, containerHeight.value);
  
  // Get min and max values for color scaling
  let min = 255, max = 0;
  spectrogramData.value.forEach(data => {
    const dataMin = Math.min(...Array.from(data.values));
    const dataMax = Math.max(...Array.from(data.values));
    if (dataMin < min) min = dataMin;
    if (dataMax > max) max = dataMax;
  });
  
  // Adjust the range to avoid extreme colors
  min += 20;
  max -= 20;
  
  // Calculate dot dimensions
  const dotWidth = (containerWidth.value / spectrogramData.value.length) + 1;
  const freqBinCount = analyser.value!.frequencyBinCount;
  const dotHeight = (containerHeight.value / freqBinCount) * (audioContext.value!.sampleRate/2 / selectedMaxFreq.value) + 1;
  
  // Draw each time slice
  spectrogramData.value.forEach((data, index) => {
    const x = (index / spectrogramData.value.length) * containerWidth.value;
    
    for (let j = 0; j < data.values.length; j++) {
      const freq = getBinFrequency(j);
      
      // Skip if frequency is higher than the selected maximum
      if (freq > selectedMaxFreq.value) continue;
      
      const y = containerHeight.value - (freq / selectedMaxFreq.value * containerHeight.value);
      const value = data.values[j];
      
      // Convert value to color
      const normalizedValue = Math.max(0, Math.min(1, (value - min) / (max - min)));
      const colorIndex = Math.floor(normalizedValue * (colorScheme.value.length - 1));
      ctx.fillStyle = colorScheme.value[colorIndex];
      
      // Draw rectangle
      ctx.fillRect(x, y, dotWidth, dotHeight);
    }
  });
  
  // Draw axes after the spectrogram
  drawAxes();
}

// Draw time and frequency axes
function drawAxes() {
  if (!canvasRef.value) return;
  
  const ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;
  
  ctx.save();
  
  // Set styles for axes
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.font = '12px Arial';
  ctx.fillStyle = '#000';
  
  // Draw X-axis (time)
  ctx.beginPath();
  ctx.moveTo(margin.value.left, containerHeight.value - margin.value.bottom);
  ctx.lineTo(containerWidth.value - margin.value.right, containerHeight.value - margin.value.bottom);
  ctx.stroke();
  
  // X-axis ticks and labels
  const timeSteps = 5; // Number of time labels
  for (let i = 0; i <= timeSteps; i++) {
    const x = margin.value.left + (containerWidth.value - margin.value.left - margin.value.right) * (i / timeSteps);
    const time = (audioDuration.value * i / timeSteps).toFixed(2);
    
    // Draw tick
    ctx.beginPath();
    ctx.moveTo(x, containerHeight.value - margin.value.bottom);
    ctx.lineTo(x, containerHeight.value - margin.value.bottom + 5);
    ctx.stroke();
    
    // Draw label
    ctx.textAlign = 'center';
    ctx.fillText(`${time}s`, x, containerHeight.value - margin.value.bottom + 15);
    
    // Draw light grid line
    ctx.beginPath();
    ctx.strokeStyle = '#e0e0e0';
    ctx.moveTo(x, margin.value.top);
    ctx.lineTo(x, containerHeight.value - margin.value.bottom);
    ctx.stroke();
    ctx.strokeStyle = '#000';
  }
  
  // Draw Y-axis (frequency)
  ctx.beginPath();
  ctx.moveTo(margin.value.left, margin.value.top);
  ctx.lineTo(margin.value.left, containerHeight.value - margin.value.bottom);
  ctx.stroke();
  
  // Y-axis ticks and labels
  const freqSteps = 5; // Number of frequency labels
  for (let i = 0; i <= freqSteps; i++) {
    const y = containerHeight.value - margin.value.bottom - (containerHeight.value - margin.value.top - margin.value.bottom) * (i / freqSteps);
    const freq = (selectedMaxFreq.value * i / freqSteps / 1000).toFixed(1);
    
    // Draw tick
    ctx.beginPath();
    ctx.moveTo(margin.value.left, y);
    ctx.lineTo(margin.value.left - 5, y);
    ctx.stroke();
    
    // Draw label
    ctx.textAlign = 'right';
    ctx.fillText(`${freq}k`, margin.value.left - 10, y + 4);
    
    // Draw light grid line
    ctx.beginPath();
    ctx.strokeStyle = '#e0e0e0';
    ctx.moveTo(margin.value.left, y);
    ctx.lineTo(containerWidth.value - margin.value.right, y);
    ctx.stroke();
    ctx.strokeStyle = '#000';
  }
  
  ctx.restore();
}

// Play the audio
function playAudio() {
  if (!audioContext.value || !audioBuffer.value || isPlaying.value) return;
  
  // Resume audio context if it was suspended
  if (audioContext.value.state === 'suspended') {
    audioContext.value.resume();
  }
  
  // Create a new source node
  audioSource.value = audioContext.value.createBufferSource();
  audioSource.value.buffer = audioBuffer.value;
  
  // Connect nodes
  audioSource.value.connect(analyser.value!);
  
  // Set volume
  gainNode.value!.gain.value = 1;
  
  // Start playback
  startTime.value = audioContext.value.currentTime;
  audioSource.value.start(0, isPaused.value ? currentTime.value : 0);
  
  isPlaying.value = true;
  isPaused.value = false;
  
  // Start rendering progress
  requestAnimationFrame(updateProgress);
}

// Pause audio playback
function pauseAudio() {
  if (!audioContext.value || !isPlaying.value) return;
  
  // Store current playback position
  currentTime.value = audioContext.value.currentTime - startTime.value;
  
  // Suspend the audio context
  audioContext.value.suspend();
  
  isPlaying.value = false;
  isPaused.value = true;
  
  // Stop the source
  if (audioSource.value) {
    audioSource.value.stop();
  }
}

// Stop audio playback
function stopAudio() {
  if (!audioContext.value) return;
  
  // Resume if paused
  if (audioContext.value.state === 'suspended') {
    audioContext.value.resume();
  }
  
  // Stop the source
  if (audioSource.value) {
    audioSource.value.stop();
  }
  
  isPlaying.value = false;
  isPaused.value = false;
  currentTime.value = 0;
  
  // Reset progress line
  const progressLineElement = document.getElementById('progress-line');
  if (progressLineElement) {
    progressLineElement.style.left = '0px';
  }
}

// Update progress line
function updateProgress() {
  if (!isPlaying.value || !audioContext.value) return;
  
  const elapsed = audioContext.value.currentTime - startTime.value;
  const progress = elapsed / audioDuration.value;
  
  // Update progress line
  const progressLineElement = document.getElementById('progress-line');
  if (progressLineElement && spectrogramContainer.value) {
    const containerWidth = spectrogramContainer.value.clientWidth;
    progressLineElement.style.left = `${progress * containerWidth}px`;
  }
  
  // Check if playback has ended
  if (elapsed >= audioDuration.value) {
    stopAudio();
    return;
  }
  
  requestAnimationFrame(updateProgress);
}

// Utility to get frequency from bin index
function getBinFrequency(index: number): number {
  if (!audioContext.value || !analyser.value) return 0;
  const nyquist = audioContext.value.sampleRate / 2;
  return index / analyser.value.frequencyBinCount * nyquist;
}

// Handle frequency select change
function onFrequencyChange(event: Event) {
  const select = event.target as HTMLSelectElement;
  selectedMaxFreq.value = parseFloat(select.value);
  renderSpectrogram();
}

// Initialize component
onMounted(() => {
  initAudio();
  
  // Initialize ResizeObserver for responsive behavior
  if (spectrogramContainer.value) {
    resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(spectrogramContainer.value);
    
    // Initial size calculation
    handleResize();
  }

  window.addEventListener('resize', handleResize);
});

// Clean up when component is unmounted
onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  
  if (audioSource.value) {
    audioSource.value.stop();
  }
  
  if (audioContext.value) {
    audioContext.value.close();
  }
});

// Watch for changes that require re-rendering
watch(selectedMaxFreq, () => {
  renderSpectrogram();
});
</script>

<template>
  <div class="spectrogram-wrapper">
    <div ref="spectrogramContainer" class="spectrogram-container">
      <canvas 
        ref="canvasRef" 
        class="spectrogram-canvas"
      ></canvas>
      
      <div 
        id="progress-line" 
        class="progress-line"
      ></div>
      
      <div v-if="!isLoaded" class="loading-spinner">
        <div class="spinner"></div>
        <span>Loading...</span>
      </div>
    </div>
    
    <div class="controls-container">
      <button 
        @click="playAudio" 
        :disabled="isPlaying || !isLoaded"
        class="control-button"
      >
        Play
      </button>
      
      <button 
        @click="isPaused ? playAudio() : pauseAudio()" 
        :disabled="!isLoaded || (!isPlaying && !isPaused)"
        class="control-button"
      >
        {{ isPaused ? 'Resume' : 'Pause' }}
      </button>
      
      <button 
        @click="stopAudio" 
        :disabled="!isPlaying && !isPaused"
        class="control-button"
      >
        Stop
      </button>
      
      <select 
        v-model="selectedMaxFreq" 
        @change="onFrequencyChange($event)"
        class="freq-select"
      >
        <option 
          v-for="freq in freqOptions" 
          :key="freq" 
          :value="parseFloat(freq)"
        >
          {{ (parseFloat(freq) / 1000).toFixed(1) }}k
        </option>
      </select>
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
  width: 100%; /* Make it responsive */
  height: 440px; /* Can be percentage-based if parent has height */
  border: 1px solid #e0e0e0;
}

.spectrogram-canvas {
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

.freq-select {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
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