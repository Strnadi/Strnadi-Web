<route lang="yaml">
meta:
  layout: desktop/center
</route>

<script setup lang="ts">
import { ref, watch } from 'vue';
import Spectrogram from '@/components/Spectrogram.vue';
import { useRouteParams } from '@vueuse/router';
import { useFetched } from '@/utils/network';
import { getFilteredRecording, getRecording, type FilteredPartModel, postFilteredPart } from '@/api/recordings';
import { type Numeric } from '@/types/basic';
import TranslatedText from '@/components/TranslatedText.vue';
import { DialectColors } from '@/views/map/RecordingsMap.vue';
import { accountStore } from '@/state/AccountStore';

const env = import.meta.env;
const id = useRouteParams<Numeric>('id');

const selectedColor = ref(DialectColors.BC);

const {
  data: recording,
  isLoading,
  error
} = useFetched(getRecording, id, false);

const { data: filteredRec } = useFetched(getFilteredRecording, id);

const currentTime = ref<number>(0);

const segments = ref<{
  id: number;
  start: number;
  end: number;
  color: string;
}[]>([]);

watch(filteredRec, (newFilteredRec?: FilteredPartModel[]) => {
  if (newFilteredRec) {
    const firstPart = recording.value?.parts?.[0];

    if (!firstPart) return;

    let i = 0;

    segments.value = newFilteredRec.map((fr) => ({
      id: fr.id * 1000 + i++,
      start:  Number((new Date(fr.startDate).getTime() - new Date(firstPart.startDate).getTime()) / 1000),
      end: Number((new Date(fr.endDate).getTime() - new Date(firstPart.startDate).getTime()) / 1000),
      color: DialectColors[fr.detectedDialects?.[0]?.confirmedDialect as keyof typeof DialectColors] ?? '#000000'
    }));
  }
});

watch(selectedColor, (newColor) => {
  if (!newColor || !currentTime.value) return;

  const segment = segments.value.find(segment => segment.start >= currentTime.value && segment.end <= currentTime.value);
  if (segment) {
    segment.color = newColor;
  }
}, { immediate: true });

const saveDialects = async () => {
  if (!accountStore.token) return;
  if (!recording.value) return;

  const firstPart = recording.value.parts?.[0]!;
  if (!firstPart) return;

  const filteredParts = segments.value.map((segment) => ({
    recordingId: recording.value.id,
    startDate: new Date(new Date(firstPart.startDate).getTime() + segment.start * 1000).toISOString(),
    endDate: new Date(new Date(firstPart.startDate).getTime() + segment.end * 1000).toISOString(),
    dialectCode: Object.keys(DialectColors).find((key) => DialectColors[key as keyof typeof DialectColors] === segment.color) ?? 'Neznámý',
  }));

  for (const filteredPart of filteredParts) {
    await postFilteredPart(accountStore.token!, filteredPart);
  }

};
</script>

<template>
  <h1>
    <TranslatedText identifier="recordings.detail.edit_dialects_title" />
  </h1>

  <template v-if="isLoading">
    <span>
      <TranslatedText identifier="loading" />
    </span>
  </template>

  <template v-if="error">
    <span>{{ error.message }}</span>
  </template>

  <template v-else>
    <div class="flex flex-col gap-y-2">
      <Spectrogram
        v-if="recording && recording.parts"
        v-model:selected="segments"
        :audio-urls="
          recording.parts.map(
            (p) =>
              `${env.VITE_API_URL}/recordings/part/${recording?.id}/${p.id}/sound`
          )
        "
        :height="400"
        :max-frequency="9000"
        :selection-color-resolver="() => selectedColor"
        v-model:currentTime="currentTime"
      />

      <div class="flex flex-row-reverse gap-x-2 items-center">
        <select v-model="selectedColor" class="p-2 px-4 flex-1 border border-gray-300 rounded-md">
          <option v-for="(color, key) in DialectColors" :key="key" :value="color">
            {{ key }}
          </option>
        </select>

        <button class="button-primary p-2 px-4 flex-1" @click="saveDialects">
          <TranslatedText identifier="buttons.save" />
        </button>
      </div>
    </div>
  </template>
</template>
