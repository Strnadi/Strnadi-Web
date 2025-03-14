<template>
  <canvas ref="canvas" :width="canvasWidth" :height="canvasHeight"></canvas>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import FFT from 'fft.js'  // Ensure you have installed this package

// Define the prop that expects a File object
interface Props {
  audioFile: File
}

const props = defineProps<Props>()

// Canvas dimensions – these will be updated dynamically once we know the spectrogram size.
const canvas = ref<HTMLCanvasElement | null>(null)
const canvasWidth = ref(800)
const canvasHeight = ref(512)

// Compute the spectrogram from the audio file
async function computeSpectrogram(file: File): Promise<void> {
  if (!file) return

  // Read the file as an ArrayBuffer and decode the audio data
  const arrayBuffer = await file.arrayBuffer()
  const audioContext = new AudioContext()
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
  const data = audioBuffer.getChannelData(0)  // Use the first channel

  // Spectrogram parameters
  const frameSize = 1024           // Size of the FFT window
  const hopSize = frameSize / 2      // 50% overlap between frames
  const numFrames = Math.floor((data.length - frameSize) / hopSize)

  // Set canvas dimensions based on the number of time frames and frequency bins
  canvasWidth.value = numFrames
  canvasHeight.value = frameSize / 2

  // Create an FFT instance for the given frame size
  const fft = new FFT(frameSize)

  // Get the canvas drawing context
  if (!canvas.value) return
  const ctx = canvas.value.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)

  // Loop through each frame and compute the FFT
  for (let frame = 0; frame < numFrames; frame++) {
    const start = frame * hopSize
    const segment = data.slice(start, start + frameSize)

    // Apply a Hann (Hanning) window to reduce spectral leakage
    for (let i = 0; i < segment.length; i++) {
      segment[i] *= 0.5 * (1 - Math.cos((2 * Math.PI * i) / (frameSize - 1)))
    }

    // Create an output array for the complex FFT result
    const out = fft.createComplexArray()
    fft.realTransform(out, segment)
    fft.completeSpectrum(out)

    // Loop over the positive frequency bins (frameSize/2 bins)
    for (let bin = 0; bin < frameSize / 2; bin++) {
      const re = out[2 * bin]
      const im = out[2 * bin + 1]
      const magnitude = Math.sqrt(re * re + im * im)
      
      // Convert magnitude to decibels (dB)
      let dB = 20 * Math.log10(magnitude)
      // Clamp values (assume useful range is from -100 dB to 0 dB)
      dB = Math.max(-100, Math.min(0, dB))
      
      // Normalize the decibel value to a 0–255 grayscale intensity
      const intensity = Math.floor(((dB + 100) / 100) * 255)
      
      // Invert the frequency axis so that low frequencies appear at the bottom
      const y = canvasHeight.value - bin - 1
      
      // Draw a 1px by 1px rectangle for this pixel
      ctx.fillStyle = `rgb(${intensity}, ${intensity}, ${intensity})`
      ctx.fillRect(frame, y, 1, 1)
    }
  }
}

// Watch for changes to the audioFile prop and re-compute the spectrogram
watch(() => props.audioFile, (newFile) => {
  if (newFile) {
    computeSpectrogram(newFile)
  }
}, { immediate: true })

onMounted(() => {
  if (props.audioFile) {
    computeSpectrogram(props.audioFile)
  }
})
</script>

<style scoped>
canvas {
  width: 100%;
  height: auto;
  image-rendering: pixelated;
}
</style>
