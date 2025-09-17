<template>
  <div
    :style="squareStyle"
    class="inline-block box-border"
  />
</template>

<script setup lang="ts">
import { computed, defineProps } from 'vue';

const props = defineProps<{
  colors: string[] | string;
  size: string;
  gradient?: boolean;
}>();

const parsedColors = computed<string[]>(() => {
  if (typeof props.colors === 'string') {
    if (!props.colors) return [];
    try {
      return JSON.parse(props.colors);
    } catch (e) {
      console.warn('MultiColorSquare: Could not parse colors string:', props.colors, e);
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
    };
  }

  if (parsedColors.value.length === 1) {
    backgroundValue = parsedColors.value[0]!;
  } else if (props.gradient) {
    backgroundValue = `linear-gradient(to bottom, ${parsedColors.value.join(', ')})`;
  } else {
    const numberOfColors = parsedColors.value.length;
    const step = 100 / numberOfColors;
    const colorStops = parsedColors.value.map((color, index) => {
      const start = index * step;
      const end = (index + 1) * step;
      if (index === 0) {
        return `${color} 0%, ${color} ${end}%`;
      }
      return `${color} ${start}%, ${color} ${end}%`;
    }).join(', ');
    backgroundValue = `linear-gradient(to bottom, ${colorStops})`;
  }

  return {
    width: props.size,
    height: props.size,
    border: '1px solid black',
    background: backgroundValue,
  };
});
</script>
