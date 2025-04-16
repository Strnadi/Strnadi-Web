<script setup lang="ts">
import { uploadStore } from '@/state/UploadStore';

import { computed } from 'vue';

const partURLs = computed(() => {
  return uploadStore.parts!.map((part) => URL.createObjectURL(part.recording));
});
</script>

<template>
  <h1>Finální potvrzení nahrávky</h1>
  <p class="text-gray-500">
    Zkontrolujte, zda je vše v pořádku. Pokud je vše v pořádku, klikněte na tlačítko "Nahrát".
    Pokud chcete nahrávku upravit, klikněte na tlačítko "Zpět" a vraťte se k předchozímu kroku.
  </p>

  <h2>Informace o nahrávce</h2>
  <p>Název nahrávky: {{ uploadStore.title }}</p>
  <p>Popis nahrávky: {{ uploadStore.note }}</p>
  <p>Počet strnadů: {{ uploadStore.birdCount }}</p>
  <p>GPS souřadnice: {{ uploadStore.location?.lat }}, {{ uploadStore.location?.lng }}</p>
  <p>Datum a čas nahrávky: {{ uploadStore.dateTime }}</p>

  <h2>Části nahrávky</h2>
  <ul class="flex flex-col gap-y-2">
    <li v-for="(_, index) in uploadStore.parts" :key="index" class="flex flex-row gap-x-2">
      <audio :src="partURLs[index]" controls class="w-1/2"></audio>
      <button @click="uploadStore.removePartByIndex(index)" class="button-secondary">Odebrat</button>
      <button @click="" class="button-secondary">Přidat dialekt</button>
    </li>
  </ul>
  <button @click="uploadStore.nextStage" class="primary p-2 w-full">
    Nahrát
  </button>
</template>
