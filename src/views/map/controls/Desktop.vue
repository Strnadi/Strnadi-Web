<script lang="ts">
import FilterIcon from '@/icons/interface/icon-filter2.svg'
</script>

<script setup lang="ts">
import { ref } from 'vue';

import { MapStore } from '@/views/map/RecordingsMap.vue';
import { accountStore } from '@/state/AccountStore';

import LocationSearch from '@/components/map/LocationSearch.vue';
import InfoIcon from '@/icons/interface/icon-info.svg';
import MapIcon from '@/icons/interface/icon-map.svg';
import RulerIcon from '@/icons/interface/icon-ruler.svg';
import FilledRulerIcon from '@/icons/interface/icon-ruler-fill.svg';
import PictureIcon from '@/icons/interface/icon-picture.svg';

import OptionsIcon from '@/icons/interface/icon-options.svg';

const toolsShown = ref(false);
const searchText = ref('');
</script>


<template>
  <div class="absolute bottom-2 right-2 z-[2] flex flex-row justify-end items-end">
    <LocationSearch
      v-model:text="searchText"
      placeholder="Hledat..."
      class="drop-shadow-lg rounded-2xl m-2 p-4 w-full sm:w-auto h-[70px]"
      @update:location="newLocation => MapStore.move(newLocation)"
    />

    <div class="flex flex-row-reverse items-end">
      <div class="flex flex-col">
        <div
          v-if="toolsShown"
          class="flex flex-col-reverse gap-x-2"
        >
          <button
            class="drop-shadow-lg rounded-2xl m-2 bg-white hover:bg-gray-100 p-4"
            @click="MapStore.scale = !MapStore.scale"
            v-wave
          >
            <FilledRulerIcon v-if="MapStore.scale" />
            <RulerIcon v-else />
          </button>

          <button
            class="drop-shadow-lg rounded-2xl m-2 bg-white hover:bg-gray-100 p-4"
            @click="MapStore.aerial = !MapStore.aerial"
            v-wave
          >
            <MapIcon v-if="MapStore.aerial" />
            <PictureIcon v-else />
          </button>
        </div>

        <button
          class="drop-shadow-lg rounded-2xl m-2 bg-white hover:bg-gray-100 p-4"
          @click="toolsShown = !toolsShown"
          v-wave
        >
          <OptionsIcon
            width="32"
            height="32"
          />
        </button>
      </div>

      <PrefetchLink
        class="drop-shadow-lg rounded-2xl m-2 hover:bg-gray-100 p-4 bg-white"
        to="/mapa/legenda"
        v-wave
      >
        <InfoIcon
          width="32"
          height="32"
        />
      </PrefetchLink>

      <select
        v-model="MapStore.filter"
        class="filter-select drop-shadow-lg rounded-2xl m-2 bg-white hover:bg-gray-100"
        aria-label="Filter recordings"
      >
        <option value="all">
          Všechny nahrávky
        </option>

        <option value="new">
          Jen nové nahrávky
        </option>

        <option value="old">
          Jen staré nahrávky
        </option>

        <option
          v-if="accountStore.user"
          value="my"
        >
          Jen moje nahrávky
        </option>

        <option
          v-if="accountStore.user"
          value="others"
        >
          Jen nahrávky ostatních
        </option>

        <option value="any-dialect">
          Jen nahrávky s dialektem
        </option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.filter-select {
/*  appearance: none;
  background-image: v-bind("`url(\"${FilterIcon}\")`");
  background-repeat: no-repeat;
  background-position: center;
  background-size: 32px 32px;
  width: 70px;*/
  height: 70px;
  padding: 10px;
  /*text-indent: 9999px;*/
  cursor: pointer;
}

</style>
