<script setup lang="ts">
import MobileDefault from '@/layouts/mobile/default.vue';
import DesktopDefault from '@/layouts/desktop/default.vue';
import { useCssVar, useMediaQuery } from '@vueuse/core';
import { computed } from 'vue';

const desktopBp = useCssVar('--breakpoint-desktop', document.documentElement);
const isDesktop = useMediaQuery(
  computed(() => `(min-width: ${desktopBp.value})`)
);
</script>

<template>
  <template v-if="!isDesktop">
    <MobileDefault />
  </template>
  <template v-else>
    <DesktopDefault />
  </template>
</template>
