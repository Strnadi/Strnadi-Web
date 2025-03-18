<script setup lang="ts">
import Spectrogram from '@strnadi/spectrogram-vue';
import { uploadStore } from '@/state/UploadStore';
import { computed, ref } from 'vue';

const dialects = ref([]);
const numberOfDialects = computed(() => dialects.value.length);

// Todo multiple parts support
const audioSrc = computed(() => {
  if (uploadStore.parts && uploadStore.parts.length > 0) {
    return URL.createObjectURL(uploadStore.parts[0].recording);
  }
  return '';
});

</script>

<template>
  <h1 class="text-2xl font-bold">Přidat předpokládaný dialekt</h1>
  <Spectrogram :audioSrc="audioSrc" :minFrequency="0" :maxFrequency="12000"/>
  <button class="primary p-3 self-start m-2">Přidat dialekt</button>
  <button v-if="numberOfDialects == 0" @click="uploadStore.nextStage" class="secondary p-2 w-full">
    Pokračovat bez dialektu
  </button>
  <button v-else @click="uploadStore.nextStage" class="primary p-2 w-full">
    Pokračovat
  </button>
</template>
