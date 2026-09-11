<route lang="yaml">
meta:
  layout: desktop/side
</route>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { useRouteParams } from '@vueuse/router';
import { divIcon } from 'leaflet';
import { getRecording, getFilteredRecording } from '@/api/recordings';
import type { FilteredPartModel } from '@/api/recordings';
import type { Numeric } from '@/types/basic';
import { accountStore } from '@/state/AccountStore';
import Spectrogram from '@/views/Spectrogram.vue';
import { DialectColors } from '@/views/map/RecordingsMap.vue';
import Map from '@/views/map/Map.vue';
import TextualCoords from '@/components/map/TextualCoords.vue';
import ProfilePhoto from '@/components/ProfilePhoto.vue';
import TranslatedText, { t } from '@/components/TranslatedText.vue';
import { getDialectStrings } from '@/utils/dialects';

const recordingId = useRouteParams<Numeric>('id');
const env = import.meta.env;

const dontShowUnknownDialects = ref(true);
const showOnlyRepresentants = ref(true);
const showAllDialects = ref(false);

const {
  data: recording,
  isError,
  isLoading
} = useQuery({
  queryKey: ['recording', recordingId],
  queryFn: () => getRecording(recordingId.value, false)
});

const { data: filteredRec, isLoading: isFilteredRecLoading } = useQuery({
  queryKey: ['filtered-recordings', recordingId],
  queryFn: () => getFilteredRecording(recordingId.value)
});

const uploaderId = computed(() => recording.value?.userId);
const uploader = computed(() =>
  uploaderId.value === accountStore.user?.id ? accountStore.user : null
);

const hasAudio = computed(() =>
  recording.value?.parts?.some((part) => part.filePath !== null)
);

const canManage = computed(
  () =>
    accountStore.user?.role === 'admin' ||
    accountStore.user?.id === recording.value?.userId
);

const recordingCoordinates = computed(() => {
  const part = recording.value?.parts?.[0];
  if (!part) return null;
  const lat = part.gpsLatitudeStart;
  const lng = part.gpsLongitudeStart;
  return Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
    ? { lat, lng }
    : null;
});

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
  return `${Math.floor(diffSec / 60)}:${Math.floor(diffSec % 60)
    .toString()
    .padStart(2, '0')}`;
};

const segments = computed(() => {
  const firstPart = recording.value?.parts?.[0];
  if (!filteredRec.value || !DialectColors.value || !firstPart) return [];
  let index = 0;
  return filteredRec.value
    .filter((part) => {
      if (showOnlyRepresentants.value && !part.representantFlag) return false;
      if (!dontShowUnknownDialects.value) return true;
      return getDialectStrings(part).some(
        (dialect) => dialect && dialect !== 'Unfinished'
      );
    })
    .map((part) => ({
      id: part.id * 1000 + index++,
      start:
        (new Date(part.startDate).getTime() -
          new Date(firstPart.startDate).getTime()) /
        1000,
      end:
        (new Date(part.endDate).getTime() -
          new Date(firstPart.startDate).getTime()) /
        1000,
      colors: getDialectStrings(part)
        .map(
          (code) =>
            DialectColors.value?.[code as keyof typeof DialectColors.value]
        )
        .filter(Boolean) as string[],
      payload: part
    }));
});

const matchingFilteredParts = computed(() =>
  (filteredRec.value ?? [])
    .filter((part) => {
      const known = getDialectStrings(part).some(
        (dialect) => dialect && dialect !== 'Unfinished'
      );
      if (dontShowUnknownDialects.value && !known) return false;
      if (showOnlyRepresentants.value && !part.representantFlag) return false;
      return true;
    })
    .toSorted(
      (a, b) =>
        Number(Boolean(b.representantFlag)) -
        Number(Boolean(a.representantFlag))
    )
);

const displayedFilteredParts = computed(() =>
  showAllDialects.value
    ? matchingFilteredParts.value
    : matchingFilteredParts.value.slice(0, 3)
);

const fallbackDialectColor = '#ded5bd';
const getDialectColor = (part: FilteredPartModel) => {
  const code = getDialectStrings(part)[0];
  return code && DialectColors.value
    ? (DialectColors.value[code as keyof typeof DialectColors.value] ??
        fallbackDialectColor)
    : fallbackDialectColor;
};

const uploaderName = computed(() => {
  if (!uploader.value) return t('labels.user');
  return uploader.value.nickname
    ? `@${uploader.value.nickname}`
    : [uploader.value.firstName, uploader.value.lastName]
        .filter(Boolean)
        .join(' ') || `${t('labels.user')} #${uploader.value.id}`;
});

const uploaderInitials = computed(() => {
  if (!uploader.value) return '?';
  const source =
    uploader.value.nickname ||
    `${uploader.value.firstName} ${uploader.value.lastName}`;
  return (
    source
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  );
});

const uploaderLocation = computed(() =>
  uploader.value
    ? [uploader.value.postCode, uploader.value.city].filter(Boolean).join(' ')
    : ''
);
</script>

<template>
  <main class="recording-detail">
    <div
      v-if="isError"
      class="recording-state recording-state--error"
      role="alert"
    >
      <TranslatedText identifier="errors.recordings.loading_single" />
    </div>
    <div
      v-else-if="isLoading"
      class="recording-state"
      role="status"
    >
      <TranslatedText identifier="states.loading" />
    </div>

    <template v-else-if="recording">
      <header class="recording-hero">
        <p class="recording-hero__eyebrow">
          <TranslatedText identifier="recordings.detail.recording_label" /> ·
          #{{ recording.id }}
        </p>
        <h1>
          {{
            recording.name ||
            `${t('recordings.detail.fallback_prefix')}${recordingId}`
          }}
        </h1>
        <div class="recording-hero__meta">
          <span>{{
            new Date(
              recording.parts?.[0]?.startDate ?? recording.createdAt
            ).toLocaleString()
          }}</span>
          <span v-if="recording.estimatedBirdsCount">
            {{ recording.estimatedBirdsCount }}
            <TranslatedText identifier="recordings.detail.birds_short" />
          </span>
        </div>
      </header>

      <section
        v-if="hasAudio"
        class="recording-player"
        aria-labelledby="recording-audio-title"
      >
        <h2
          id="recording-audio-title"
          class="sr-only"
        >
          <TranslatedText identifier="recordings.detail.audio_heading" />
        </h2>
        <Spectrogram
          :audio-urls="
            recording.parts?.map(
              (part) =>
                `${env.VITE_API_URL}/recordings/part/${recordingId}/${part.id}/sound`
            ) ?? []
          "
          :height="200"
          :readonly="true"
          :download-only-selections="true"
          initial-viewport="fit-selection"
          :simple-controls="true"
          :selected="segments"
        >
          <template #range-tooltip="{ range }">
            <div class="recording-tooltip">
              <strong>{{
                getDialectStrings(range.payload as FilteredPartModel).join(', ')
              }}</strong>
              <span
                >{{
                  formatRelTime((range.payload as FilteredPartModel).startDate)
                }}–{{
                  formatRelTime((range.payload as FilteredPartModel).endDate)
                }}</span
              >
            </div>
          </template>
        </Spectrogram>
      </section>

      <div class="recording-layout">
        <div class="recording-layout__main">
          <section class="recording-section recording-dialects">
            <div class="recording-section__heading">
              <div>
                <p class="recording-section__kicker">
                  <TranslatedText
                    identifier="recordings.detail.analysis_label"
                  />
                </p>
                <h2>
                  <TranslatedText
                    identifier="recordings.detail.detected_dialects_heading"
                  />
                </h2>
              </div>
              <span class="recording-count">{{
                matchingFilteredParts.length
              }}</span>
            </div>

            <div
              v-if="isFilteredRecLoading"
              class="recording-empty"
            >
              <TranslatedText identifier="states.loading" />
            </div>
            <ul
              v-else-if="displayedFilteredParts.length"
              class="dialect-list"
            >
              <li
                v-for="part in displayedFilteredParts"
                :key="part.id"
                class="dialect-row"
              >
                <span
                  class="dialect-row__swatch"
                  :style="{ backgroundColor: getDialectColor(part) }"
                />
                <div class="dialect-row__content">
                  <strong>{{
                    getDialectStrings(part).join(', ') ||
                    t('recordings.detail.unknown_dialect')
                  }}</strong>
                  <span
                    >{{ formatRelTime(part.startDate) }}–{{
                      formatRelTime(part.endDate)
                    }}</span
                  >
                </div>
                <span
                  v-if="part.representantFlag"
                  class="dialect-row__featured"
                  :title="t('recordings.detail.representative')"
                  >★</span
                >
              </li>
            </ul>
            <p
              v-else
              class="recording-empty"
            >
              <TranslatedText identifier="recordings.detail.no_dialects" />
            </p>

            <button
              v-if="matchingFilteredParts.length > 3"
              type="button"
              class="recording-text-button"
              @click="showAllDialects = !showAllDialects"
            >
              <TranslatedText
                :identifier="
                  showAllDialects ? 'buttons.show_less' : 'buttons.show_more'
                "
              />
            </button>

            <details class="recording-disclosure">
              <summary>
                <span
                  ><TranslatedText
                    identifier="recordings.detail.display_options"
                /></span>
                <span
                  class="recording-disclosure__chevron"
                  aria-hidden="true"
                  >⌄</span
                >
              </summary>
              <div class="recording-disclosure__body">
                <label class="recording-toggle">
                  <span
                    ><TranslatedText
                      identifier="recordings.detail.hide_unknown"
                  /></span>
                  <input
                    v-model="dontShowUnknownDialects"
                    type="checkbox"
                  />
                </label>
                <label class="recording-toggle">
                  <span
                    ><TranslatedText
                      identifier="recordings.detail.only_representatives"
                  /></span>
                  <input
                    v-model="showOnlyRepresentants"
                    type="checkbox"
                  />
                </label>
              </div>
            </details>
          </section>

          <section
            v-if="recording.note || uploaderId"
            class="recording-section recording-about"
          >
            <h2>
              <TranslatedText identifier="recordings.detail.about_heading" />
            </h2>
            <p
              v-if="recording.note"
              class="recording-note"
            >
              {{ recording.note }}
            </p>
            <p
              v-else
              class="recording-note recording-note--empty"
            >
              <TranslatedText identifier="recordings.detail.no_note" />
            </p>

            <RouterLink
              v-if="uploaderId"
              :to="`/uzivatel/${uploaderId}`"
              class="recording-uploader"
            >
              <ProfilePhoto
                :user-id="uploaderId"
                :fallback-text="uploaderInitials"
              />
              <span class="recording-uploader__text">
                <small
                  ><TranslatedText identifier="recordings.detail.uploaded_by"
                /></small>
                <strong>{{ uploaderName }}</strong>
                <span v-if="uploaderLocation">{{ uploaderLocation }}</span>
              </span>
              <span
                class="recording-uploader__arrow"
                aria-hidden="true"
                >›</span
              >
            </RouterLink>
          </section>

          <section
            v-if="recordingCoordinates"
            class="recording-section recording-map"
          >
            <div class="recording-section__heading">
              <div>
                <p class="recording-section__kicker">
                  <TranslatedText
                    identifier="recordings.detail.location_label"
                  />
                </p>
                <h2>
                  <TextualCoords
                    :lat="recordingCoordinates.lat"
                    :lng="recordingCoordinates.lng"
                    type="municipality_part"
                  />
                </h2>
              </div>
            </div>
            <Map
              class="recording-map__canvas"
              :position="[
                recordingCoordinates.lat,
                recordingCoordinates.lng,
                15
              ]"
              :markers="[
                {
                  id: 'recording-location',
                  icon: divIcon({
                    className: 'recording-location-marker',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10],
                    html: '<span></span>'
                  }),
                  position: [recordingCoordinates.lat, recordingCoordinates.lng]
                }
              ]"
            />
            <p class="recording-coordinates">
              {{ recordingCoordinates.lat.toFixed(5) }},
              {{ recordingCoordinates.lng.toFixed(5) }}
            </p>
          </section>
          <p
            v-else
            class="recording-state"
          >
            <TranslatedText
              identifier="recordings.detail.location_unavailable"
            />
          </p>

          <section
            v-if="recording.photos?.length"
            class="recording-section recording-photos"
          >
            <div class="recording-section__heading">
              <h2>
                <TranslatedText identifier="recordings.detail.photos_heading" />
              </h2>
              <span class="recording-count">{{ recording.photos.length }}</span>
            </div>
            <ul>
              <li
                v-for="photo in recording.photos"
                :key="photo.id"
              >
                <a
                  :href="photo.url"
                  target="_blank"
                  rel="noopener"
                >
                  <img
                    :src="photo.url"
                    :alt="photo.name || t('recordings.detail.photo_alt')"
                    loading="lazy"
                  />
                </a>
              </li>
            </ul>
          </section>
        </div>

        <aside class="recording-layout__aside">
          <details
            class="recording-section recording-disclosure recording-technical"
          >
            <summary>
              <span
                ><TranslatedText
                  identifier="recordings.detail.technical_details"
              /></span>
              <span
                class="recording-disclosure__chevron"
                aria-hidden="true"
                >⌄</span
              >
            </summary>
            <dl>
              <div>
                <dt>ID</dt>
                <dd>{{ recording.id }}</dd>
              </div>
              <div v-if="recording.device">
                <dt>
                  <TranslatedText identifier="recordings.detail.device_label" />
                </dt>
                <dd>{{ recording.device }}</dd>
              </div>
              <div>
                <dt>
                  <TranslatedText identifier="recordings.detail.source_label" />
                </dt>
                <dd>
                  <TranslatedText
                    :identifier="
                      recording.byApp
                        ? 'recordings.detail.source_app'
                        : 'recordings.detail.source_web'
                    "
                  />
                </dd>
              </div>
              <div>
                <dt>
                  <TranslatedText
                    identifier="recordings.detail.parts_heading"
                  />
                </dt>
                <dd>{{ recording.parts?.length ?? 0 }}</dd>
              </div>
            </dl>
          </details>

          <section
            v-if="canManage"
            class="recording-section recording-actions"
          >
            <h2>
              <TranslatedText identifier="recordings.detail.manage_heading" />
            </h2>
            <RouterLink
              :to="`/mapa/nahravka/${recordingId}/upravit-dialekt`"
              class="button-secondary"
            >
              <TranslatedText identifier="admin.recordings.edit_dialects" />
            </RouterLink>
            <RouterLink
              :to="`/mapa/nahravka/${recordingId}/upravit`"
              class="button-secondary"
            >
              <TranslatedText identifier="buttons.edit" />
            </RouterLink>
            <div class="recording-actions__danger">
              <RouterLink
                :to="`/mapa/nahravka/${recordingId}/smazat`"
                class="button-danger"
              >
                <TranslatedText
                  :identifier="
                    accountStore.user?.role === 'admin'
                      ? 'recordings.detail.delete_recording'
                      : 'recordings.detail.request_delete'
                  "
                />
              </RouterLink>
            </div>
          </section>
        </aside>
      </div>
    </template>

    <div
      v-else
      class="recording-state"
    >
      <TranslatedText identifier="recordings.detail.not_found" />
    </div>
  </main>
</template>

<style scoped>
.recording-detail {
  width: 100%;
  color: var(--mobile-ink);
}
.recording-hero {
  margin-bottom: 1.25rem;
}
.recording-hero__eyebrow,
.recording-section__kicker {
  margin: 0 0 0.3rem;
  color: #886a00;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}
.recording-hero h1 {
  margin: 0;
  font-size: clamp(2rem, 6vw, 3.5rem);
  font-weight: 820;
  letter-spacing: -0.045em;
  line-height: 1.04;
}
.recording-hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 1rem;
  margin-top: 0.65rem;
  color: var(--mobile-muted);
  font-size: 0.88rem;
}
.recording-player {
  overflow: hidden;
  margin-bottom: 1rem;
  border: 1px solid var(--mobile-border);
  border-radius: var(--mobile-radius);
  background: #fff;
  box-shadow: var(--mobile-shadow);
}
.recording-tooltip {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.recording-layout {
  display: grid;
  gap: 1rem;
}
.recording-layout__main,
.recording-layout__aside {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 1rem;
}
.recording-section {
  padding: 1rem;
  border: 1px solid var(--mobile-border);
  border-radius: var(--mobile-radius);
  background: var(--mobile-surface);
}
.recording-section h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 780;
}
.recording-section__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.9rem;
}
.recording-count {
  display: grid;
  min-width: 2rem;
  height: 2rem;
  padding: 0 0.5rem;
  place-items: center;
  border-radius: 999px;
  background: var(--mobile-yellow);
  font-size: 0.8rem;
  font-weight: 800;
}
.dialect-list {
  display: flex;
  margin: 0;
  padding: 0;
  flex-direction: column;
  list-style: none;
}
.dialect-row {
  display: flex;
  min-height: 3.6rem;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0;
}
.dialect-row + .dialect-row {
  border-top: 1px solid var(--mobile-border);
}
.dialect-row__swatch {
  width: 1rem;
  height: 2rem;
  flex: 0 0 auto;
  border: 1px solid var(--mobile-ink);
  border-radius: 0.35rem;
}
.dialect-row__content {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}
.dialect-row__content strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dialect-row__content span {
  color: var(--mobile-muted);
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}
.dialect-row__featured {
  color: #b48900;
  font-size: 1.2rem;
}
.recording-empty {
  margin: 0;
  padding: 0.75rem 0;
  color: var(--mobile-muted);
  font-size: 0.9rem;
}
.recording-text-button {
  width: 100%;
  min-height: 2.75rem;
  margin-top: 0.35rem;
  border: 0;
  border-radius: 0.75rem;
  background: var(--mobile-cream);
  color: var(--mobile-ink);
  font-weight: 750;
}
.recording-disclosure {
  padding: 0;
  overflow: clip;
}
.recording-dialects .recording-disclosure {
  margin-top: 0.75rem;
  border: 1px solid var(--mobile-border);
  border-radius: 0.85rem;
}
.recording-disclosure summary {
  display: flex;
  min-height: 3.25rem;
  cursor: pointer;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  font-weight: 750;
  list-style: none;
}
.recording-disclosure summary::-webkit-details-marker {
  display: none;
}
.recording-disclosure__chevron {
  font-size: 1.25rem;
  transition: transform 160ms ease;
}
.recording-disclosure[open] .recording-disclosure__chevron {
  transform: rotate(180deg);
}
.recording-disclosure__body {
  padding: 0 0.8rem 0.8rem;
}
.recording-toggle {
  display: flex;
  min-height: 3.25rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.88rem;
}
.recording-toggle + .recording-toggle {
  border-top: 1px solid var(--mobile-border);
}
.recording-toggle input {
  width: 2.75rem;
  min-height: 1.6rem;
  accent-color: var(--mobile-yellow-strong);
}
.recording-note {
  margin: 0.8rem 0 1rem;
  line-height: 1.55;
}
.recording-note--empty {
  color: var(--mobile-muted);
}
.recording-uploader {
  display: flex;
  min-height: 4rem;
  align-items: center;
  gap: 0.75rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--mobile-border);
  color: inherit;
  text-decoration: none;
}
.recording-uploader :deep(img),
.recording-uploader :deep(.profile-photo-fallback) {
  width: 3rem;
  height: 3rem;
  flex: 0 0 auto;
  object-fit: cover;
  border-radius: 999px;
}
.recording-uploader__text {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}
.recording-uploader__text small,
.recording-uploader__text > span {
  color: var(--mobile-muted);
  font-size: 0.76rem;
}
.recording-uploader__text strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.recording-uploader__arrow {
  font-size: 1.8rem;
}
.recording-map__canvas {
  width: 100%;
  height: clamp(14rem, 52vw, 25rem);
  overflow: hidden;
  border-radius: 1rem;
}
.recording-coordinates {
  margin: 0.5rem 0 0;
  color: var(--mobile-muted);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}
.recording-photos ul {
  display: grid;
  margin: 0;
  padding: 0;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
  list-style: none;
}
.recording-photos img {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 1rem;
  object-fit: cover;
}
.recording-technical dl {
  margin: 0;
  padding: 0 1rem 1rem;
}
.recording-technical dl > div {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  padding: 0.6rem 0;
  border-top: 1px solid var(--mobile-border);
}
.recording-technical dt {
  color: var(--mobile-muted);
}
.recording-technical dd {
  margin: 0;
  font-weight: 700;
  text-align: right;
}
.recording-actions {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.recording-actions h2 {
  margin-bottom: 0.25rem;
}
.recording-actions a {
  display: grid;
  min-height: 2.75rem;
  place-items: center;
  padding: 0.65rem 1rem;
  text-align: center;
}
.recording-actions__danger {
  margin-top: 0.35rem;
  padding-top: 0.9rem;
  border-top: 1px solid #e8b5aa;
}
.recording-actions__danger a {
  width: 100%;
}
.recording-state {
  padding: 1rem;
  border: 1px solid var(--mobile-border);
  border-radius: var(--mobile-radius);
  background: var(--mobile-surface);
  color: var(--mobile-muted);
}
.recording-state--error {
  border-color: #e8b5aa;
  background: #fff6f1;
  color: var(--mobile-danger);
}
:deep(.recording-location-marker) {
  border: 2px solid #fff;
  border-radius: 999px;
  background: #e9483f;
  box-shadow: 0 2px 9px rgba(0, 0, 0, 0.28);
}
:deep(.recording-location-marker span) {
  display: block;
  width: 100%;
  height: 100%;
}

@media (max-width: 59.999rem) {
  .recording-hero {
    margin-bottom: 1rem;
  }
  .recording-hero h1 {
    font-size: 2rem;
  }
  .recording-player {
    margin-inline: -1rem;
    border-right: 0;
    border-left: 0;
    border-radius: 0;
    box-shadow: none;
  }
  .recording-section {
    padding: 0.9rem;
    border-radius: 1rem;
    box-shadow: none;
  }
  .recording-map {
    padding: 0;
    overflow: hidden;
  }
  .recording-map .recording-section__heading {
    padding: 0.9rem 0.9rem 0;
  }
  .recording-map__canvas {
    height: clamp(14rem, 62vw, 20rem);
    border-radius: 0;
  }
  .recording-coordinates {
    padding: 0 0.9rem 0.7rem;
  }
}
</style>
