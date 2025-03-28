<script setup lang="ts">
import { ref } from 'vue';

const name = ref('');
const surname = ref('');
const nickname = ref('');
const zipcode = ref('');
const town = ref('');

</script>

<template>
  <h1 class="flex flex-row justify-between">
    <span>Osobní údaje</span>
    <button class="secondary py-1 px-2 text-sm">Uložit</button>
  </h1>
  <div>
    <label for="name" class="block text-sm font-medium mb-1">Jméno</label>
    <input
      id="name"
      v-model="name"
      name="name"
      type="text"
      placeholder="Jméno"
      class="w-full p-2 border rounded"
    />
  </div>
  <div>
    <label for="surname" class="block text-sm font-medium mb-1">Příjmení</label>
    <input
      id="surname"
      v-model="surname"
      name="surname"
      type="text"
      placeholder="Příjmení"
      class="w-full p-2 border rounded"
    />
  </div>
  <div>
    <label for="nickname" class="block text-sm font-medium mb-1">Přezdívka</label>
    <input
      id="nickname"
      v-model="nickname"
      name="nickname"
      type="text"
      placeholder="Přezdívka"
      class="w-full p-2 border rounded"
    />
  </div>
  <div>
    <label for="zipcode" class="block text-sm font-medium mb-1">PSČ</label>
    <input
      id="zipcode"
      v-model="zipcode"
      name="zipcode"
      type="number"
      placeholder="PSČ"
      class="w-full p-2 border rounded"
    />
  </div>
  <div>
    <label for="obec" class="block text-sm font-medium mb-1">Obec</label>
    <input
      id="obec"
      v-model="town"
      name="obec"
      type="text"
      placeholder="Obec"
      class="w-full p-2 border rounded"
    />
  </div>
</template>
