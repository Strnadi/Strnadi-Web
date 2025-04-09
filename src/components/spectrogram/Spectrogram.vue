<template>
  <div id="vis" class="spectrogram" ref="spectrogramContainer"></div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';

// @ts-expect-error
import Spectrogram from './spectrogram.js';

interface SpectrogramProps {
  audioSrc: string;
  width?: number;
  height?: number;
  sampleSize?: number;
  maxFrequency?: number;
  minFrequency?: number;
  colorScheme?: string[];
}

const props = defineProps<SpectrogramProps>();

let spectrogram: Spectrogram;

onMounted(() => {
  spectrogram = new Spectrogram(props.audioSrc, '#vis', {
    width: props.width,
    height: props.height,
    sampleSize: props.sampleSize,
    maxFrequency: props.maxFrequency,
    minFrequency: props.minFrequency,
    colorScheme: props.colorScheme
  });
});

onBeforeUnmount(() => {
  // Clean up resources when component is destroyed
  if (spectrogram) {
    spectrogram.destroy();
  }
});
</script>
