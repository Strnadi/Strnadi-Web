<template>
  <label for="map-mode-select">Vyberte podklad mapy:</label>
  
  <select id="map-mode-select" v-model="mapStore.mode">
    <option
      v-for="(modeLabel, modeOption) in {'outdoor': 'Turistická', 'aerial': 'Letecká', 'basic': 'Základní'}"
      :key="modeOption"
      :value="modeOption"
    >
      {{ modeLabel }}
    </option>
  </select>
</template>

<script setup lang="ts">
import { mapStore } from '@/state/MapStore';
</script>
