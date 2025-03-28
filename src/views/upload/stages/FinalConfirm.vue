<script setup lang="ts">
import { uploadStore } from '@/state/UploadStore';

import { computed } from 'vue';

const partURLs = computed(() => {
  return uploadStore.parts!.map((part) => URL.createObjectURL(part.recording));
});
</script>

<template>
  <h1>Finální potvrzení</h1>
  <h2>Nahrávky</h2>
  <div class="flex flex-col gap-y-2">
    <div v-for="(_, index) in uploadStore.parts" :key="index" class="flex flex-row gap-x-2">
      <audio :src="partURLs[index]" controls class="w-1/2"></audio>
      <button @click="uploadStore.removePartByIndex(index)" class="button-secondary">Odebrat</button>
    </div>
  </div>
  <button @click="uploadStore.nextStage" class="primary p-2 w-full">
    Nahrát
  </button>
</template>
