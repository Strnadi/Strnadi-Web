<script setup vapor lang="ts">
import RecordingsMap, { MapEvents } from '@/views/map/RecordingsMap.vue';
import MapControls from '@/views/map/controls/Mobile.vue';
import { useEventLast } from '@/utils/events';
import { useCssVar, useMediaQuery } from '@vueuse/core';
import { useRouter } from 'vue-router';
import { computed } from 'vue';

const router = useRouter();
const desktopBp = useCssVar('--breakpoint-desktop', document.documentElement);
const isDesktop = useMediaQuery(
  computed(() => `(min-width: ${desktopBp.value})`)
);

useEventLast(MapEvents, 'click', ({ recording, recordingId }) => {
  const id = recordingId ?? recording?.id;
  if (id !== undefined) {
    router.push(`/mapa/nahravka/${id}`);
  } else {
    router.push('/');
  }
});
</script>

<template>
  <div
    v-if="!isDesktop"
    class="relative flex flex-1 pointer-events-none"
  >
    <MapControls class="pointer-events-auto" />
  </div>
</template>
