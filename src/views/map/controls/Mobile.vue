<script setup vapor lang="ts">
import LocationSearch from '@/components/map/LocationSearch.vue';
import { MapStore } from '@/views/map/RecordingsMap.vue';
import LocationArrowIcon from '@/icons/interface/icon-location-arrow.svg';
import { useGeolocation } from '@vueuse/core';
import { computed } from 'vue';
import { accountStore } from '@/state/AccountStore';

import InfoIcon from '@/icons/interface/icon-info.svg';
import MapIcon from '@/icons/interface/icon-map.svg';
import RulerIcon from '@/icons/interface/icon-ruler.svg';
import FilledRulerIcon from '@/icons/interface/icon-ruler-fill.svg';
import PictureIcon from '@/icons/interface/icon-picture.svg';

const { coords, isSupported: isGeolocationSupported } = useGeolocation();
const hasValidLocation = computed(
  () =>
    isGeolocationSupported.value &&
    Number.isFinite(coords.value.latitude) &&
    Number.isFinite(coords.value.longitude) &&
    !(coords.value.latitude === 0 && coords.value.longitude === 0)
);
</script>

<template>
  <div
    class="absolute top-0 left-0 flex flex-1 w-full h-full z-[10000] pointer-events-none"
  >
    <div
      class="absolute top-0 left-0 flex flex-row w-full justify-around items-center p-2 pointer-events-auto"
    >
      <button
        v-if="hasValidLocation"
        type="button"
        aria-label="Přejít na moji polohu"
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
      <select
        v-model="MapStore.filter"
        class="m-2 rounded bg-white p-2 shadow"
        aria-label="Filtrovat nahrávky"
      >
        <option value="all">Všechny</option>
        <option value="new">Nové</option>
        <option value="old">Staré</option>
        <option v-if="accountStore.user" value="my">Moje</option>
        <option v-if="accountStore.user" value="others">Ostatních</option>
        <option value="any-dialect">S dialektem</option>
      </select>
      <RouterLink
        aria-label="Legenda mapy"
        class="drop-shadow-lg rounded-2xl m-2 hover:bg-gray-100 p-4 bg-white"
        to="/mapa/legenda"
      >
        <InfoIcon
          width="24"
          height="24"
        />
      </RouterLink>
      <button
        type="button"
        aria-label="Zobrazit měřítko"
        :aria-pressed="MapStore.scale"
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
        type="button"
        aria-label="Přepnout leteckou mapu"
        :aria-pressed="MapStore.aerial"
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
      <button
        type="button"
        class="drop-shadow-lg rounded-2xl m-2 hover:bg-gray-100 p-3 bg-white text-xs"
        :aria-pressed="MapStore.grouping"
        @click="MapStore.grouping = !MapStore.grouping"
      >
        Seskupit
      </button>
      <button
        type="button"
        class="drop-shadow-lg rounded-2xl m-2 hover:bg-gray-100 p-3 bg-white text-xs"
        :aria-pressed="MapStore.onlyDialects"
        @click="MapStore.onlyDialects = !MapStore.onlyDialects"
      >
        S dialektem
      </button>
    </div>
  </div>
</template>
