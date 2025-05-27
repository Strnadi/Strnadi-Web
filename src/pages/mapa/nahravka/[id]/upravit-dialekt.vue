<route>
meta:
  layout: desktop/center
</route>

<script setup lang="ts">
import { ref } from 'vue';
import Spectrogram from '@/components/Spectrogram.vue';
import { useRouteParams } from '@vueuse/router';
import { useFetched } from '@/utils/network';
import { getRecording } from '@/api/recordings';
import { type Numeric } from '@/types/basic';

const env = import.meta.env;
const id = useRouteParams<Numeric>('id');

const { data: recording, isLoading, error } = useFetched(getRecording, id, false);

const segments = ref([]);

</script>

<template>
  <h1>Upravit dialekty nahrávky</h1>

  <template v-if="isLoading">
    <span>Načítání</span>
  </template>

  <template v-if="error">
    <span>{{ error.message }}</span>
  </template>

  <template v-else>
    <Spectrogram
      v-if="recording && recording.parts"
      v-model:selected="segments"
      :audio-urls="recording.parts.map(p => `${env.VITE_API_URL}/recordings/part/${recording?.id}/${p.id}/sound`)"
      :height="400"
    />
  </template>
</template>
