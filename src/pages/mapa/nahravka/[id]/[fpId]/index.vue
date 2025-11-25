<script setup lang="ts">
import { useRouteParams } from '@vueuse/router';
import { ref } from 'vue';

import Spectrogram from '@/views/Spectrogram.vue';
import { useQuery } from '@tanstack/vue-query';
import { getFilteredRecording } from '@/api/recordings';
import type { Numeric } from '@/types/basic';

const env = import.meta.env;

const recordingId = useRouteParams('id');
const filteredPartId = useRouteParams<Numeric>('fpId');

const audio = ref<HTMLAudioElement | null>(null);

const { data: filteredPart } = useQuery({
  queryKey: ['filtered-recordings', filteredPartId],
  queryFn: () => getFilteredRecording(filteredPartId.value)
});
</script>

<template>
  <h1>Detekovaný dialekt</h1>

  <audio
    ref="audio"
    :src="`${env.VITE_API_URL}/recordings/part/${recordingId}/${partId}/sound`"
    controls
    class="w-full"
  />

  <Spectrogram
    v-if="filteredPart"
    :audio-urls="[
      `${env.VITE_API_URL}/recordings/part/${recordingId}/${partId}/sound`
    ]"
    :download-only-selections="true"
    :selected="[filteredPart]"
  />
</template>
