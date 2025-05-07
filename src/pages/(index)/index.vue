<script setup lang="ts">
import Map from '@/views/Map.vue';
import { useCssVar, useMediaQuery } from '@vueuse/core';
import { computed } from 'vue';

const desktopBp = useCssVar('--breakpoint-desktop', document.documentElement);
const isDesktop = useMediaQuery(
  computed(() => `(min-width: ${desktopBp.value})`)
);
</script>

<template>
  <div class="flex flex-1" v-if="!isDesktop"><Map /></div>
</template>
