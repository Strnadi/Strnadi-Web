<script setup lang="ts">
import Map, { MapEvents } from '@/views/map/RecordingsMap.vue';
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

useEventLast(MapEvents, 'click', ({ recording, recordingPart, square }) => {

  if (recording && recordingPart) {
    router.push(`/mapa/nahravka/${recording.id}/${recordingPart.id}`);
  } else if (square) {
    router.push(`/mapa/ctverec/${square}`);
  } else {
    router.push("/");
  }

});
</script>

<template>
  <div
    v-if="!isDesktop"
    class="relative flex flex-1"
  >
    <Map />
    <MapControls />
  </div>
</template>
