<script setup lang="ts">
import { applicationStore } from '@/state/ApplicationStore';
import Map, { MapEvents } from '@/views/map/RecordingsMap.vue';
import MapControls from '@/views/map/controls/Desktop.vue';
import Navbar from '@/views/nav/Navbar.vue';
import Notification from '@/views/Notification.vue';
import { useEventLast } from '@/utils/events';
import { uploadStore } from '@/pages/mapa/nahrat.vue';
import { soundAccept } from '@/pages/mapa/nahrat.vue';

import { useRouter } from 'vue-router';
import Dropzone from '@/components/Dropzone.vue';

const router = useRouter();
const goHome = () => {
  router.push('/');
};


function getZoom() {
  // visualViewport is most reliable for scale on mobile/modern browsers
  if (window.visualViewport && typeof window.visualViewport.scale === 'number') {
    return window.visualViewport.scale; // 1 = 100%
  }
  // devicePixelRatio is often equal to zoom on desktop/mobile
  if (window.devicePixelRatio) {
    return window.devicePixelRatio;
  }
  // fallback: ratio of outer to inner width (desktop heuristics)
  return window.outerWidth / window.innerWidth;
}

function applyUnzoom(wrapper) {
  const zoom = window.devicePixelRatio;
  console.log('Zoom level:', zoom);
  const scale = 1 / zoom;

  // Apply scale and correct width so layout doesn't collapse
  // We set transform-origin to 0 0 to keep top-left anchored
  wrapper.style.transformOrigin = '0 0';
  wrapper.style.transform = `scale(${scale})`;

  // To prevent horizontal scrollbars, expand the wrapper's width proportional to zoom:
  wrapper.style.width = `${100 * zoom}%`;

  // Optional: adjust height similarly (depends on your layout)
  wrapper.style.height = `${100 * zoom}%`;

  wrapper.style.top = `${100 * zoom}%`;
}

// Hook into events
const wrapper = document.documentElement; // document.getElementById('page-wrapper');
if (wrapper) {
  // initial apply
  applyUnzoom(wrapper);

  // update when viewport changes -- use visualViewport if possible (more granular)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => applyUnzoom(wrapper));
    window.visualViewport.addEventListener('scroll', () => applyUnzoom(wrapper));
  } else {
    window.addEventListener('resize', () => applyUnzoom(wrapper));
  }
}


// useEventLast(MapEvents, 'click', ({ recording, recordingPart, square }) => {
//
//   if (recording && recordingPart) {
//     router.push(`/mapa/nahravka/${recording.id}/${recordingPart.id}`);
//   } else if (square) {
//     router.push(`/mapa/ctverec/${square}`);
//   } else {
//     goHome();
//   }
//
// });
</script>

<template>
  <!-- <Dropzone :headless="true" :multiple="true" :accept="soundAccept" @drop="async (files) => { -->
  <!-- await router.push('/mapa/nahrat'); -->
  <!-- // console.log(files); -->
  <!-- uploadStore.setRecordings(files) -->
  <!-- // console.log(typeof files); -->
  <!-- }> -->
  <!-- <template #dragging>
      <div class="flex w-screen h-screen"><span class="m-auto">Upusťte soubory pro nahrání</span></div>
    </template> -->

  <div class="flex min-w-svw min-h-svh" @keyup.escape="goHome">
    <Navbar />
    <aside v-if="applicationStore.notifications.length" class="notifications">
      <ul class="flex flex-col-reverse gap-y-2">
        <li
          v-for="(notification, index) in applicationStore.notifications"
          :key="index"
        >
          <Notification
            :kind="notification.kind"
            :title="notification.title"
            :message="notification.message"
            @dismiss="applicationStore.notifications.splice(index, 1)"
          />
        </li>
      </ul>
    </aside>
    <div class="flex flex-1">
      <Map />
      <MapControls />
    </div>
  </div>

  <router-view />
  <!-- </Dropzone> -->
</template>

<style scoped>
@reference "../../styles/main.css";

aside.notifications {
  @apply fixed;
  @apply top-20;
  @apply desktop:top-30;
  @apply right-5;
  @apply z-[6];
}

.notifications > ul {
  @apply grid grid-cols-[auto_1fr] overflow-y-auto max-h-[90vh] desktop:max-h-[80vh] items-center;
  @apply rounded-4xl;
  @apply p-8;
  @apply bg-white/90;
}
</style>
