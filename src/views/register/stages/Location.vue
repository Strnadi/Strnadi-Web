<template>
  <h1>Kde se nacházíte?</h1>
  <div class="flex flex-col gap-y-4">
    <div class="flex flex-col gap-y-1">
      <label for="postalCode" class="block text-sm font-medium" >PSČ</label>
      <input id="postalCode" v-model="registerStore.postCode" name="postalCode" type="number" min="0" max="99999" />
      <p class="text-gray-600">Nepovinné. Tyto údaje budou použity k doručování novinek z vaší lokality.</p>
    </div>
    <div class="flex flex-col gap-y-1">
      <label for="city" class="block text-sm font-medium">Město</label>
      <LocationSearch id="city" v-model:text="registerStore.city" />
      <p class="text-gray-600">Nepovinné. Toto bude zobrazeno veřejně na vašem profilu.</p>
    </div>
    <button class="primary p-2 m-2" @click="registerStore.nextStage">Pokračovat</button>
  </div>
</template>

<script setup lang="ts">
import LocationSearch from '@/components/map/LocationSearch.vue';
import { registerStore } from '@/state/RegisterStore'
</script>
