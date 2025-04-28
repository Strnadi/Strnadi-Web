<script setup lang="ts">
/* @ts-ignore */
import Spectrogram from '@/features/Spectrogram/components/Spectrogram.vue';
import { uploadStore } from '@/features/Upload/state/UploadStore';
import { computed, ref } from 'vue';

const dialects = ref([]);
const numberOfDialects = computed(() => dialects.value.length);

// Todo multiple parts support
const audioSrc = computed(() => {
  return uploadStore.parts && uploadStore.parts.length > 0
    ? URL.createObjectURL(uploadStore.parts[0].file)
    : '';
});

</script>

<template>
  <h1>Přidat předpokládaný dialekt</h1>
  <Spectrogram :audioUrl="audioSrc" :minFrequency="0" :maxFrequency="12000" />
  <button class="primary p-3 self-start m-2">Přidat dialekt</button>
  <button v-if="numberOfDialects == 0" @click="uploadStore.nextStage" class="secondary p-2 w-full">
    Pokračovat bez dialektu
  </button>
  <button v-else @click="uploadStore.nextStage" class="primary p-2 w-full">
    Pokračovat
  </button>
</template>
