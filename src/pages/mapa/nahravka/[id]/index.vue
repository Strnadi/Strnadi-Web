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
import RecordingsMap from '@/views/map/RecordingsMap.vue';
import Map from '@/views/map/Map.vue';
import { divIcon } from 'leaflet';

// Vue doesn't re-render this component when route changes; it re-uses the old instance
// So, in turn, we need to handle that ourselves and not declare this just as an constant.
const recordingId = useRouteParams<Numeric>('id');

const env = import.meta.env;

const selected = ref([]);
const audio = ref<HTMLAudioElement | null>(null);

const dontShowUnknownDialects = ref(true);

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

const segments = computed<
  {
    id: number;
    start: number;
    end: number;
    color?: string;
    colors?: string[];
    payload?: FilteredPartModel;
  }[]
>(() => {
  if (filteredRec.value && DialectColors.value) {
    const firstPart = recording.value?.parts?.[0];

    if (!firstPart) return [];

    let i = 0;

    return filteredRec.value
      .filter((fr) => {
        if (!dontShowUnknownDialects.value) {
          return true;
        }

        return fr.detectedDialects?.some(
          (dd) =>
            dd.confirmedDialect || dd.predictedDialect || dd.userGuessDialect
        );
      })
      .map((fr) => ({
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
          .filter(Boolean) as string[],
        payload: fr
      }));
  }

  return [];
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
  <h1 class="text-xl sm:text-2xl font-semibold break-words">
    <template v-if="recording?.name">
      {{ recording.name }}
    </template>
    <template v-else>
      {{ t('recordings.detail.fallback_prefix') }}{{ recordingId }}
    </template>
  </h1>

  <template v-if="isError">
    <span class="text-lg sm:text-xl text-red-600">
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
    <div class="flex flex-col w-full gap-y-4">
      <div
        class="flex flex-col sm:flex-row justify-around w-full text-xs sm:text-sm text-gray-600 space-y-1 sm:space-y-0 sm:divide-x divide-gray-300"
      >
        <span
          v-if="recording.device"
          class="text-center sm:px-2"
        >
          {{ recording.device }}
        </span>
        <span class="text-center sm:px-2">{{
          new Date(
            recording.parts?.[0]?.startDate ?? recording.createdAt!
          ).toLocaleString()
        }}</span>
      </div>

      <div>
        <div
          class="-mx-4 sm:mx-0 p-3 sm:p-4 transition touch-manipulation gap-2 bg-white"
        >
          <Spectrogram
            v-if="recording && filteredRec && DialectColors"
            :audio-urls="
              recording.parts?.map(
                (p) =>
                  `${env.VITE_API_URL}/recordings/part/${recording.id}/${p.id}/sound`
              ) ?? []
            "
            :height="200"
            :readonly="true"
            :download-only-selections="true"
            :no-controls="true"
            :selected="segments"
          >
            <template #range-tooltip="{ range, close }">
              <div>
                <h4 class="font-bold">
                  {{
                    getDialectStrings(range.payload as FilteredPartModel).join(
                      ', '
                    )
                  }}
                </h4>
                <p>
                  {{ formatRelTime(range.payload?.startDate) }} -
                  {{ formatRelTime(range.payload?.endDate) }}
                </p>
              </div>
            </template>
          </Spectrogram>
        </div>
        <div class="details-toggle-card">
          <p class="details-toggle-text">
            Nezobrazovat nedokončená a neznámá nářečí
          </p>
          <label class="toggle-switch">
            <input
              v-model="dontShowUnknownDialects"
              type="checkbox"
              class="toggle-switch-input"
            />
            <span
              class="toggle-switch-track"
              :class="{
                'toggle-switch-track--active': dontShowUnknownDialects
              }"
            >
              <span class="toggle-switch-thumb" />
            </span>
          </label>
        </div>
        <div
          v-if="filteredRec?.length"
          class="space-y-3 sm:space-y-4 mt-4 sm:mt-6"
        >
          <h3 class="text-base sm:text-lg font-medium mb-2">
            <TranslatedText
              identifier="recordings.detail.detected_dialects_heading"
            />
          </h3>
          <ul class="space-y-2 sm:space-y-3">
            <li
              v-for="fr in filteredRec.toSorted((a, b) =>
                a.representantFlag === b.representantFlag
                  ? 0
                  : a.representantFlag
                    ? -1
                    : 1
              )"
              :key="fr.id"
              class="flex flex-col gap-1 rounded-lg border p-3 sm:p-4 shadow-sm transition touch-manipulation"
              :style="{
                backgroundColor: getDialectColorWithAlpha(fr, 'background'),
                borderColor: getDialectColorWithAlpha(fr, 'border')
              }"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
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
                  <p class="font-semibold text-sm sm:text-base truncate">
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
                  class="text-lg sm:text-xl flex-shrink-0"
                  :style="{ color: getDialectColorWithAlpha(fr, 'star') }"
                  >★</span
                >
              </div>
              <span class="text-xs sm:text-sm text-gray-600">
                {{ formatRelTime(fr.startDate) }} -
                {{ formatRelTime(fr.endDate) }}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div class="flex w-full h-[400px] rounded-lg">
        <Map
          :position="[
            recording.parts?.[0]?.gpsLatitudeStart ?? 0,
            recording.parts?.[0]?.gpsLongitudeStart ?? 0,
            17
          ]"
          :markers="[
            {
              id: 'recording-location',
              icon: divIcon({
                className: '',
                iconSize: [24, 24],
                iconAnchor: [19, 19],
                html: `<div class='w-2 h-2 bg-red-500 rounded-full'></div>`
              }),
              position: [
                recording.parts?.[0]?.gpsLatitudeStart ?? 0,
                recording.parts?.[0]?.gpsLongitudeStart ?? 0
              ]
            }
          ]"
        />
      </div>

      <div
        class="flex flex-col w-full gap-y-4"
        v-if="recording.photos?.length"
      >
        <h3 class="text-base sm:text-lg font-medium mb-2">
          <TranslatedText identifier="recordings.detail.photos_heading" />
        </h3>
        <ul class="flex flex-row gap-x-2 overflow-x-auto">
          <li
            v-for="photo in recording.photos"
            :key="photo.id"
          >
            <img
              :src="photo.url"
              :alt="photo.name"
              class="w-24 h-24 object-cover rounded-lg"
            />
          </li>
        </ul>
      </div>

      <prefetch-link
        v-if="uploader"
        :to="`/uzivatel/${uploader.id}`"
      >
        <UserCard :user="uploader" />
      </prefetch-link>

      <blockquote>
        <template v-if="recording.note">
          {{ recording.note }}
        </template>
        <template v-else>
          <TranslatedText identifier="recordings.detail.no_note" />
        </template>
      </blockquote>

      <div class="flex flex-col gap-2 sm:gap-3">
        <prefetch-link
          v-if="
            accountStore.user?.role === 'admin' ||
            accountStore.user?.id === recording.userId
          "
          :to="`./${recordingId}/upravit-dialekt`"
          class="button-secondary py-3 px-4 text-sm sm:text-base text-center touch-manipulation"
        >
          <TranslatedText identifier="admin.recordings.edit_dialects" />
        </prefetch-link>

        <div class="flex flex-col md:flex-row gap-2 w-full">
          <prefetch-link
            v-if="
              accountStore.user?.role == 'admin' ||
              accountStore.user?.id == recording?.userId
            "
            :to="`./${recordingId}/upravit`"
            class="button-secondary py-3 px-4 text-sm sm:text-base text-center touch-manipulation w-full"
          >
            <TranslatedText identifier="buttons.edit" />
          </prefetch-link>
          <prefetch-link
            v-if="accountStore.user?.role == 'admin'"
            :to="`./${recordingId}/smazat`"
            class="button-danger py-3 px-4 text-sm sm:text-base text-center touch-manipulation w-full"
          >
            <TranslatedText identifier="recordings.detail.delete_recording" />
          </prefetch-link>
          <prefetch-link
            v-else-if="
              accountStore.user?.role == 'user' &&
              accountStore.user?.id == recording.userId
            "
            :to="`./${recordingId}/smazat`"
            class="button-danger py-3 px-4 text-sm sm:text-base text-center touch-manipulation w-full"
          >
            <TranslatedText identifier="recordings.detail.request_delete" />
          </prefetch-link>
        </div>
      </div>
    </div>
  </template>
  <template v-else>
    <!-- Fallback if recording is null after loading -->
    <span class="text-gray-500">
      <TranslatedText identifier="recordings.detail.not_found" />
    </span>
  </template>
</template>

<style scoped>
@reference '../../../../styles/main.css';

.details-toggle-card {
  @apply flex items-center justify-between gap-4 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm;
}

.details-toggle-text {
  @apply text-sm sm:text-base font-medium text-gray-800;
  @apply flex-1 min-w-0;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
}
</style>
