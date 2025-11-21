<route lang="yaml">
meta:
  layout: desktop/side
</route>

<script setup lang="ts">
import { onBeforeRouteUpdate } from 'vue-router';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { useRouteParams } from '@vueuse/router';
import { getRecording, getFilteredRecording } from '@/api/recordings';
import { getUserInfo } from '@/api/account';
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { accountStore } from '@/state/AccountStore';
import type { Numeric } from '@/types/basic';
import Spectrogram from '@/views/Spectrogram.vue';
import ToggleShow from '@/components/ToggleShow.vue';
import { MapStore } from '@/views/map/RecordingsMap.vue';
import MultiColorSquare from '@/components/MultiColorSquare.vue';
import { DialectColors } from '@/views/map/RecordingsMap.vue';
import TranslatedText, { t } from '@/components/TranslatedText.vue';
import type { FilteredPartModel } from '@/api/recordings';
import UserCard from '@/views/UserCard.vue';
import { getDialectStrings } from '@/utils/dialects';

// Vue doesn't re-render this component when route changes; it re-uses the old instance
// So, in turn, we need to handle that ourselves and not declare this just as an constant.
const recordingId = useRouteParams<Numeric>('id');

const env = import.meta.env;

const selected = ref([]);
const audio = ref<HTMLAudioElement | null>(null);

const {
  data: recording,
  isError,
  isLoading
} = useQuery({
  queryKey: ['recordings', recordingId.value],
  queryFn: () => getRecording(recordingId.value, false)
});

const { data: filteredRec, isLoading: isFilteredRecLoading } = useQuery({
  queryKey: ['filtered-recordings', recordingId.value],
  queryFn: () => getFilteredRecording(recordingId.value)
});

const enabled = computed(() => !!recording.value?.userId);

// todo select location in the map

// Dependent query - only runs when we have an uploaderEmail from the recording
const {
  data: uploader,
  isLoading: isUploaderLoading,
  isError: isUploaderError
} = useQuery({
  queryKey: ['user', recording.value?.userId],
  queryFn: () =>
    getUserInfo(recording.value?.userId!, accountStore.token ?? undefined),
  enabled // Use the computed enabled value
});

const queryClient = useQueryClient();

onBeforeRouteUpdate(async (to) => {
  recordingId.value = to.params.id as string;
  await queryClient.invalidateQueries({ queryKey: ['recordings'] });
  await queryClient.invalidateQueries({ queryKey: ['filtered-recordings'] });
  await queryClient.invalidateQueries({ queryKey: ['user'] });
});

const segments = ref<
  | {
      id: number;
      start: number;
      end: number;
      color?: string;
      colors?: string[];
    }[]
  | null
>(null);

watch(filteredRec, (newFilteredRec?: FilteredPartModel[]) => {
  if (newFilteredRec && DialectColors.value) {
    const firstPart = recording.value?.parts?.[0];

    if (!firstPart) return;

    let i = 0;

    segments.value = newFilteredRec.map((fr) => ({
      id: fr.id * 1000 + i++,
      start: Number(
        (new Date(fr.startDate).getTime() -
          new Date(firstPart.startDate).getTime()) /
          1000
      ),
      end: Number(
        (new Date(fr.endDate).getTime() -
          new Date(firstPart.startDate).getTime()) /
          1000
      ),
      // --- color mapping fix ---
      // Collect dialect codes in priority (confirmed > predicted > guess)
      colors: getDialectStrings(fr)
        .map(
          (code) =>
            DialectColors.value?.[code as keyof typeof DialectColors.value]
        )
        .filter(Boolean) as string[]
    }));
  }
});

// onMounted(() => {
//   MapStore.move([ recordingPart.gpsLatitudeStart, recordingPart.gpsLongitudeStart ], 17);
// })

// onUnmounted(MapStore.unmove);

// watch(recording, (currentValue) => {
//   if(currentValue) {
//     MapStore.move([
//       currentValue.parts?.[0].gpsLatitudeStart,
//       currentValue.parts?.[0].gpsLongitudeStart
//     ], 17);
//   }
// }, { immediate: true });

// todo move when selecting diff recordings (onBeforeRouteUpdate)

// Helper to get mm:ss from absolute date based on first part start
const firstPartStart = computed(() => {
  const start = recording.value?.parts?.[0]?.startDate;
  return start ? new Date(start).getTime() : null;
});

const formatRelTime = (dateStr: string) => {
  if (!firstPartStart.value) return '0:00';
  const diffSec = Math.max(
    0,
    (new Date(dateStr).getTime() - firstPartStart.value) / 1000
  );
  const min = Math.floor(diffSec / 60).toString();
  const sec = Math.floor(diffSec % 60)
    .toString()
    .padStart(2, '0');
  return `${min}:${sec}`;
};

const fallbackDialectColor = '#e2e8f0';

const DIALECT_COLOR_ALPHA = {
  background: 0.15,
  border: 0.45,
  star: 1
} as const;

type DialectColorUsage = keyof typeof DIALECT_COLOR_ALPHA;

const getDialectBaseColor = (filteredPart: FilteredPartModel) => {
  const firstDialect = getDialectStrings(filteredPart)[0];
  if (!firstDialect || !DialectColors.value) {
    return fallbackDialectColor;
  }

  return (
    DialectColors.value[firstDialect as keyof typeof DialectColors.value] ??
    fallbackDialectColor
  );
};

const hexToRgba = (hexColor: string, alpha: number) => {
  const normalized = hexColor.trim();
  if (!normalized.startsWith('#')) {
    return hexColor;
  }

  let value = normalized.slice(1);
  if (value.length === 3 || value.length === 4) {
    value = value
      .split('')
      .map((char) => char + char)
      .join('');
  }

  if (value.length !== 6 && value.length !== 8) {
    return hexColor;
  }

  const rgb = value.slice(0, 6);
  const baseAlphaHex = value.length === 8 ? value.slice(6) : 'ff';

  const r = parseInt(rgb.slice(0, 2), 16);
  const g = parseInt(rgb.slice(2, 4), 16);
  const b = parseInt(rgb.slice(4, 6), 16);
  const baseAlpha = parseInt(baseAlphaHex, 16) / 255;

  const finalAlpha = Math.min(
    1,
    Math.max(0, Math.round(baseAlpha * alpha * 1000) / 1000)
  );

  return `rgba(${r}, ${g}, ${b}, ${finalAlpha})`;
};

const getDialectColorWithAlpha = (
  filteredPart: FilteredPartModel,
  usage: DialectColorUsage
) => {
  const baseColor = getDialectBaseColor(filteredPart);
  return hexToRgba(baseColor, DIALECT_COLOR_ALPHA[usage]);
};
</script>

<template>
  <h1 class="text-2xl font-semibold">
    <template v-if="recording?.name">
      {{ recording.name }}
    </template>
    <template v-else>
      {{ t('recordings.detail.fallback_prefix') }}{{ recordingId }}
    </template>
  </h1>

  <template v-if="isError">
    <span class="text-xl text-red-600">
      <TranslatedText identifier="common.error_prefix" />
      <span class="ml-1">
        <TranslatedText identifier="errors.recordings.loading_single" />
      </span>
    </span>
  </template>
  <template v-if="isLoading">
    <span class="text-gray-500">
      <TranslatedText identifier="states.loading" />
    </span>
  </template>
  <template v-else-if="recording">
    <div class="space-y-4">
      <!-- Metadata Section -->
      <div
        class="flex flex-row justify-around w-full text-sm text-gray-600 space-y-1"
      >
        <template v-if="recording.device">
          {{ recording.device }}
        </template>
        <span>{{
          new Date(
            recording.parts?.[0]?.startDate ?? recording.createdAt!
          ).toLocaleString()
        }}</span>
      </div>

      <prefetch-link v-if="uploader" :to="`/uzivatel/${uploader.id}`">
        <UserCard :user="uploader" />
      </prefetch-link>

      <blockquote class="p-3 bg-gray-50 border-l-4 border-gray-300 italic">
        <template v-if="recording.note">
          {{ recording.note }}
        </template>
        <template v-else>
          <TranslatedText identifier="recordings.detail.no_note" />
        </template>
      </blockquote>

      <!-- Filtered Parts Section -->
      <div v-if="filteredRec?.length" class="space-y-4 mt-6">
        <h3 class="text-lg font-medium mb-2">
          <TranslatedText
            identifier="recordings.detail.detected_dialects_heading"
          />
        </h3>
        <ul class="space-y-3">
          <li
            v-for="fr in filteredRec.toSorted((a, b) =>
              a.representantFlag === b.representantFlag
                ? 0
                : a.representantFlag
                  ? -1
                  : 1
            )"
            :key="fr.id"
            class="flex flex-col gap-1 rounded-lg border p-4 shadow-sm transition"
            :style="{
              backgroundColor: getDialectColorWithAlpha(fr, 'background'),
              borderColor: getDialectColorWithAlpha(fr, 'border')
            }"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <!-- <MultiColorSquare
                  size="14px"
                  v-if="DialectColors?.['value']"
                  :colors="(
                    fr.detectedDialects?.map(dd => {
                      const code = dd.confirmedDialect ?? dd.predictedDialect ?? dd.userGuessDialect;
                      return code && DialectColors.value[code as keyof typeof DialectColors.value] ?? null;
                    }).filter(Boolean) as string[]
                  ) ?? []"
                /> -->
                <p class="font-semibold">
                  {{
                    fr.detectedDialects?.[0]?.confirmedDialect ??
                    fr.detectedDialects?.[0]?.predictedDialect ??
                    fr.detectedDialects?.[0]?.userGuessDialect ??
                    t('recordings.detail.unknown_dialect')
                  }}
                </p>
              </div>
              <span
                v-if="fr.representantFlag"
                class="text-lg"
                :style="{ color: getDialectColorWithAlpha(fr, 'star') }"
                >★</span
              >
            </div>
            <span class="text-sm text-gray-600">
              {{ formatRelTime(fr.startDate) }} -
              {{ formatRelTime(fr.endDate) }}
            </span>
          </li>
        </ul>
      </div>

      <Spectrogram
        v-if="recording && filteredRec && DialectColors && segments"
        :audio-urls="
          recording.parts?.map(
            (p) =>
              `${env.VITE_API_URL}/recordings/part/${recording.id}/${p.id}/sound`
          ) ?? []
        "
        :height="300"
        :readonly="true"
        :download-only-selections="true"
        :no-controls="true"
        :selected="segments"
      >
        <template #range-tooltip="{ range, close }">
          <div class="p-2 bg-blue-100 border border-blue-300 rounded shadow-md">
            <h4 class="font-bold">Custom Tooltip!</h4>
            <p>Range ID: {{ range.id }}</p>
            <p>Starts at: {{ range.start.toFixed(2) }}s</p>
            <p>Ends at: {{ range.end.toFixed(2) }}s</p>
            <button class="text-blue-500 hover:underline mt-1" @click="close">
              Dismiss
            </button>
          </div>
        </template>
      </Spectrogram>
      <!-- End Filtered Parts Section -->

      <prefetch-link
        v-if="
          accountStore.user?.role === 'admin' ||
          accountStore.user?.id === recording.userId
        "
        :to="`./${recordingId}/upravit-dialekt`"
        class="button-secondary py-2 px-4 max-sm:text-sm"
      >
        <TranslatedText identifier="admin.recordings.edit_dialects" />
      </prefetch-link>

      <prefetch-link
        v-if="
          accountStore.user?.role == 'admin' ||
          accountStore.user?.id == recording?.userId
        "
        :to="`./${recordingId}/upravit`"
        class="button-secondary py-2 px-4 max-sm:text-sm"
      >
        <TranslatedText identifier="buttons.edit" />
      </prefetch-link>
      <prefetch-link
        v-if="accountStore.user?.role == 'admin'"
        :to="`./${recordingId}/smazat`"
        class="button-primary py-2 px-4 max-sm:text-sm"
      >
        <TranslatedText identifier="recordings.detail.delete_recording" />
      </prefetch-link>
      <prefetch-link
        v-else-if="
          accountStore.user?.role == 'user' &&
          accountStore.user?.id == recording.userId
        "
        :to="`./${recordingId}/smazat`"
        class="button-secondary py-2 px-4 max-sm:text-sm"
      >
        <TranslatedText identifier="recordings.detail.request_delete" />
      </prefetch-link>
    </div>
  </template>
  <template v-else>
    <!-- Fallback if recording is null after loading -->
    <span class="text-gray-500">
      <TranslatedText identifier="recordings.detail.not_found" />
    </span>
  </template>
</template>
