<script setup lang="ts">
import LocationSearch from '@/components/map/LocationSearch.vue';
import { MapStore } from '@/views/map/RecordingsMap.vue';
import LocationArrowIcon from '@/icons/interface/icon-location-arrow.svg';
import { useGeolocation } from '@vueuse/core';

import InfoIcon from '@/icons/interface/icon-info.svg';
import MapIcon from '@/icons/interface/icon-map.svg';
import RulerIcon from '@/icons/interface/icon-ruler.svg';
import FilledRulerIcon from '@/icons/interface/icon-ruler-fill.svg';
import PictureIcon from '@/icons/interface/icon-picture.svg';

const { coords, isSupported: isGeolocationSupported } = useGeolocation();
</script>

<template>
  <div
    class="absolute top-0 left-0 flex flex-1 w-full h-full z-[10000] pointer-events-none"
  >
    <div
      class="absolute top-0 left-0 flex flex-row w-full justify-around items-center p-2 pointer-events-auto"
    >
      <button
        v-if="isGeolocationSupported"
        class="secondary p-3"
        @click="() => MapStore.move([coords.latitude, coords.longitude], 14)"
      >
        <LocationArrowIcon />
      </button>

      <LocationSearch
        placeholder="Hledat..."
        class="drop-shadow-lg rounded-2xl m-2 p-4 w-full h-12"
        @update:location="(newLocation) => MapStore.move(newLocation)"
      />
    </div>

    <div
      class="absolute bottom-0 right-0 flex flex-col p-2 pointer-events-auto"
    >
      <PrefetchLink
        class="drop-shadow-lg rounded-2xl m-2 hover:bg-gray-100 p-4 bg-white"
        to="/mapa/legenda"
      >
        <InfoIcon
          width="24"
          height="24"
        />
      </PrefetchLink>
      <button
        class="drop-shadow-lg rounded-2xl m-2 hover:bg-gray-100 p-4 bg-white"
        @click="MapStore.scale = !MapStore.scale"
      >
        <RulerIcon
          v-if="!MapStore.scale"
          width="24"
          height="24"
        />
        <FilledRulerIcon
          v-else
          width="24"
          height="24"
        />
      </button>
      <button
        class="drop-shadow-lg rounded-2xl m-2 hover:bg-gray-100 p-4 bg-white"
        @click="MapStore.aerial = !MapStore.aerial"
      >
        <PictureIcon
          v-if="!MapStore.aerial"
          width="24"
          height="24"
        />
        <MapIcon
          v-else
          width="24"
          height="24"
        />
      </button>
    </div>
  </div>
</template>
