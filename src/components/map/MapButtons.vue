<script setup lang="ts">
import InfoIcon from '@/assets/icon-info.svg';
import MapIcon from '@/assets/icon-map.svg';
import PictureIcon from '@/assets/icon-picture.svg';
import { mapStore } from '@/state/MapStore';

</script>

<template>
  <PrefetchLink
    to="/mapa/legenda"
    class="drop-shadow-lg rounded-2xl m-2 hover:bg-gray-100 p-4 bg-white"
  >
    <img :src="InfoIcon" />
  </PrefetchLink>

  <button
    class="drop-shadow-lg rounded-2xl m-2 hover:bg-gray-100 p-4 bg-white"
    @click="mapStore.mode = mapStore.mode == 'aerial' ? 'outdoor' : 'aerial'"
  >
    <img :src="mapStore.mode == 'aerial' ? MapIcon : PictureIcon" />
  </button>
</template>
