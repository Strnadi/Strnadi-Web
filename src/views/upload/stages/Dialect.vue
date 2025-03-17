<script setup lang="ts">
import Spectrogram from '@strnadi/spectrogram-vue';
import { uploadStore } from '@/state/UploadStore';
import { computed, ref } from 'vue';

const dialects = ref([]);
const numberOfDialects = computed(() => dialects.value.length);

// Todo multiple parts support
const audioSrc = URL.createObjectURL(uploadStore.parts![0].recording);

</script>

<template>
  <h1 class="text-2xl font-bold">Přidat předpokládaný dialekt</h1>
  <div class="flex flex-col gap-y-2">
    <Spectrogram :audioSrc="audioSrc" :minFrequency="0" :maxFrequency="12000"/>
    <div class="flex flex-row">
      <button class="primary p-2">Přidat dialekt</button>
    </div>
    <button v-if="numberOfDialects == 0" @click="uploadStore.nextStage" class="secondary p-2 w-full">
      Pokračovat bez dialektu
    </button>
    <button v-else @click="uploadStore.nextStage" class="primary p-2 w-full">
      Pokračovat
    </button>
  </div>
</template>
