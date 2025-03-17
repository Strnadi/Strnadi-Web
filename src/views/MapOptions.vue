<template>
  <label for="map-mode-select">Vyberte podklad mapy:</label>
  
  <select id="map-mode-select" v-model="mapStore.mode">
    <option
      v-for="modeOption in ['basic', 'aerial', 'outdoor']"
      :key="modeOption"
      :value="modeOption"
    >
      {{ modeOption }}
    </option>
  </select>
</template>

<script setup lang="ts">
import { mapStore } from '@/state/MapStore';
</script>
