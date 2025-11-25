<template>
  <div :style="squareStyle" class="inline-block box-border">
    <div
      v-if="dot === 'true'"
      class="absolute m-auto top-0 left-0 right-0 bottom-0 w-1/2 h-1/2 bg-black rounded-full"
    />
  </div>
</template>

<script setup vapor lang="ts">
import { computed, defineProps } from 'vue';

const props = defineProps<{
  colors: string[] | string;
  size: string;
  gradient?: boolean;
  dot?: string; // dot in the center of the square above the background
  questionmark?: string; // question mark in the center of the square above the background
}>();

const parsedColors = computed<string[]>(() => {
  if (typeof props.colors === 'string') {
    if (!props.colors) return [];
    try {
      return JSON.parse(props.colors);
    } catch (e) {
      console.warn(
        'MultiColorSquare: Could not parse colors string:',
        props.colors,
        e
      );
      return [];
    }
  }
  if (Array.isArray(props.colors)) {
    return props.colors;
  }
  return [];
});

const squareStyle = computed(() => {
  let backgroundValue = '';

  if (parsedColors.value.length === 0) {
    return {
      width: props.size,
      height: props.size,
      background: 'transparent',
      border: '1px solid grey',
      'border-radius': '0.2rem'
    };
  }

  if (parsedColors.value.length === 1) {
    backgroundValue = parsedColors.value[0]!;
  } else if (props.gradient) {
    backgroundValue = `linear-gradient(to bottom right, ${parsedColors.value.join(', ')})`;
  } else {
    const numberOfColors = parsedColors.value.length;
    const step = 100 / numberOfColors;
    const colorStops = parsedColors.value
      .map((color, index) => {
        const start = index * step;
        const end = (index + 1) * step;
        if (index === 0) {
          return `${color} 0%, ${color} ${end}%`;
        }
        return `${color} ${start}%, ${color} ${end}%`;
      })
      .join(', ');
    backgroundValue = `linear-gradient(to bottom right, ${colorStops})`;
  }

  return {
    width: props.size,
    height: props.size,
    border: '1px solid black',
    background: backgroundValue,
    'border-radius': '0.2rem'
  };
});
</script>
