<route lang="yaml">
meta:
  layout: desktop/center
</route>

<script lang="ts">
import { ref, watch, computed, onUnmounted, reactive } from 'vue';
import { accountStore } from '@/state/AccountStore';
import {
  MapEvents,
  type MapClickEvent,
  MapStore
} from '@/views/map/RecordingsMap.vue';
import { useStepper } from '@vueuse/core';
import { type RecordingPartUploadParams } from '@/api/recordings';
import { divIcon, type Icon } from 'leaflet';
import { uploadQueueStore } from '@/state/UploadStore';
import SegmentedProgress from '@/components/SegmentedProgress.vue';

import '@vuepic/vue-datepicker/dist/main.css';

export const soundAccept = ['audio/*', 'application/ogg', 'application/vorbis'];

interface LatLng {
  lat: number;
  lng: number;
}

interface RecordingPart {
  file: File;
  location: LatLng | null;
}

export const uploadStore = reactive({
  parts: null as RecordingPart[] | null,
  photos: null as File[] | null,
  dialects: [] as string[],
  note: '' as string | null,
  title: '' as string,
  device: '' as string | null,
  birdCount: 1,
  dateTime: new Date().toISOString(),
  notificationsOptIn: false,
  confirmUpload: false,

  setRecordings(recordings: File[]) {
    this.parts ??= [];
    console.log(recordings);

    this.parts.push(
      ...(recordings.map((recording) => ({
        file: recording,
        location: null
      })) as RecordingPart[])
    );
  },

  removePart(recording: File) {
    if (this.parts) {
      this.parts = this.parts.filter((part) => part.file !== recording);
    }
  },

  removePartByIndex(index: number) {
    if (this.parts) {
      this.parts.splice(index, 1);
    }
  },

  reset() {
    this.parts = null;
    this.photos = null;
    this.dialects = [];
    this.note = null;
    this.title = '';
    this.device = null;
    this.birdCount = 1;
    this.dateTime = new Date().toISOString();
    this.notificationsOptIn = false;
  }
});
</script>

<script setup lang="ts">
import Dropzone from '@/components/Dropzone.vue';
import MaterialIcon from '@/components/MaterialIcon.vue';
import TextualCoords from '@/components/map/TextualCoords.vue';
import TranslatedText, { t } from '@/components/TranslatedText.vue';
import type { TranslationIdentifier } from '@/constants/Translations';
import RecordingsMap from '@/views/map/RecordingsMap.vue';
import { useCssVar, useMediaQuery } from '@vueuse/core';

const error = ref<string | null>(null);
const isSubmitting = ref(false);
const uploadSuccess = ref(false);

const photoAccept = 'image/*';

// Check if we're on mobile
const desktopBp = useCssVar('--breakpoint-desktop', document.documentElement);
const isDesktop = useMediaQuery(
  computed(() => `(min-width: ${desktopBp.value})`)
);

type StepIdentifier = 'file' | 'photos' | 'location' | 'info' | 'submit';

interface Step {
  title: TranslationIdentifier;
  isValid: () => boolean;
  before?: () => void;
  after?: () => void;
}

const colors = computed(() =>
  Array.from(
    { length: uploadStore.parts?.length ?? 0 },
    () => '#' + ((Math.random() * 0xffffff) << 0).toString(16).padStart(6, '0')
  )
);

const makeSelectedIcon = (partIndex: number) =>
  divIcon({
    className: 'my-custom-pin',
    iconSize: [24, 24],
    iconAnchor: [0, 12],
    html: `<span style="
      background-color: ${colors.value[partIndex]};
      width: 2rem;
      height: 2rem;
      display: block;
      left: -1.5rem;
      top: -1.5rem;
      position: relative;
      border-radius: 3rem 3rem 0;
      transform: rotate(45deg);
      border: 1px solid #FFFFFF;" />`
  });

const handleMapClick = (event: MapClickEvent) => {
  MapStore.markers[`selected-part-${currentPartIndex.value}`] = {
    icon: makeSelectedIcon(currentPartIndex.value) as Icon,
    id: `selected-part-${currentPartIndex.value}`,
    position: [event.event.latlng.lat, event.event.latlng.lng]
  };

  const partToUpdate = uploadStore.parts?.[currentPartIndex.value];
  if (partToUpdate) {
    partToUpdate.location = {
      lat: event.event.latlng.lat,
      lng: event.event.latlng.lng
    };
  }
  currentPartIndex.value =
    (currentPartIndex.value + 1) % (uploadStore.parts?.length ?? 0);

  // Cancel further event processing.
  return false;
};

// Define the steps for the upload process
const stepper = useStepper<Record<StepIdentifier, Step>>({
  file: {
    title: 'upload.steps.file',
    isValid: () =>
      (uploadStore.parts?.length ?? 0) > 0 &&
      (uploadStore.parts?.every((part) => part.file) ?? false) &&
      !isSubmitting.value &&
      !uploadSuccess.value
  },

  location: {
    title: 'upload.steps.location',
    isValid: () => uploadStore.parts?.every((part) => part.location) ?? false,
    before: () => {
      MapEvents.on('click', handleMapClick);
    },
    after: () => {
      MapEvents.off('click', handleMapClick);
    }
  },

  info: {
    title: 'upload.steps.info',
    isValid: () =>
      !!uploadStore.dateTime &&
      uploadStore.title.trim().length > 0 &&
      !isSubmitting.value &&
      !uploadSuccess.value
  },

  photos: {
    title: 'upload.steps.photos',
    isValid: () => !isSubmitting.value && !uploadSuccess.value
  },

  submit: {
    title: 'upload.steps.submit',
    isValid: () => !isSubmitting.value && !uploadSuccess.value // Final step, always valid to view
  }
});

watch(
  () => stepper.current.value,
  (newStep, oldStep) => {
    if (oldStep?.after) {
      oldStep.after();
    }
    if (newStep?.before) {
      newStep.before();
    }
  }
);

const removeMarkers = () => {
  const selectedParts = Object.keys(MapStore.markers).filter((key) =>
    key.startsWith('selected-part-')
  );

  for (const key of selectedParts) {
    delete MapStore.markers[key];
  }
};

const submit = () => {
  if (isSubmitting.value) return;

  isSubmitting.value = true;
  uploadSuccess.value = false;

  const recording = {
    createdAt: new Date().toISOString(),
    estimatedBirdsCount: uploadStore.birdCount,
    device: uploadStore.device || '',
    name: uploadStore.title,
    byApp: false,
    note: uploadStore.note,
    expectedPartsCount: uploadStore.parts?.length || 0
  };

  // Each file is treated as a separate recording part
  // Note: endDate will be calculated in UploadStore based on audio duration
  const recordingParts = uploadStore.parts!.map(
    ({ file, location }) =>
      ({
        startDate: uploadStore.dateTime,
        endDate: uploadStore.dateTime, // Placeholder, will be recalculated
        gpsLatitudeStart: location!.lat,
        gpsLatitudeEnd: location!.lat,
        gpsLongitudeStart: location!.lng,
        gpsLongitudeEnd: location!.lng,
        data: file
      }) as RecordingPartUploadParams
  );

  // Add to background upload queue
  uploadQueueStore.addTask(
    recording,
    recordingParts,
    uploadStore.photos ?? undefined,
    accountStore.token!
  );

  // Reset form and show success
  uploadSuccess.value = true;
  isSubmitting.value = false;

  // Reset store and UI
  uploadStore.reset();
  removeMarkers();
  stepper.goTo('file');

  // Redirect to map after a short delay
  // setTimeout(() => {
  //   router.push('/');
  // }, 2000);
};

onUnmounted(removeMarkers);
onUnmounted(() => {
  MapEvents.off('click', handleMapClick);
});

function submitOrNext() {
  if (stepper.current.value.isValid()) {
    if (stepper.next.value === 'submit') {
      submit();
    } else {
      stepper.goToNext();
    }
  }
}

const onSoundDrop = (acceptedFiles: File[]) => {
  if (acceptedFiles.length === 0) {
    error.value = t('upload.errors.no_valid_files');
    return;
  }

  uploadStore.setRecordings(acceptedFiles);
};

const onPhotoDrop = (acceptedFiles: File[]) => {
  uploadStore.photos ??= [];

  uploadStore.photos.push(...acceptedFiles);
  error.value = null;
};

const makeURL = (file: File) => {
  const url = URL.createObjectURL(file);
  return url;
};

// Function to check if all previous steps are valid for navigation links
function allStepsBeforeAreValid(index: number): boolean {
  return !Array.from({ length: index }, () => null).some(
    (_, i) => !stepper.at(i)?.isValid()
  );
}

const currentPartIndex = ref(0);

const dateInputValue = computed({
  get() {
    if (!uploadStore.dateTime) return '';
    const date = new Date(uploadStore.dateTime);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toISOString().slice(0, 10);
  },
  set(value: string) {
    if (!value) return;
    const [year, month, day] = value
      .split('-')
      .map((segment) => Number(segment));
    if (!year || !month || !day) return;
    const current = uploadStore.dateTime
      ? new Date(uploadStore.dateTime)
      : new Date();
    current.setFullYear(year, month - 1, day);
    uploadStore.dateTime = new Date(current).toISOString();
  }
});

const timeInputValue = computed({
  get() {
    if (!uploadStore.dateTime) return '';
    const date = new Date(uploadStore.dateTime);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  },
  set(value: string) {
    if (!value) return;
    const [hours, minutes] = value.split(':').map((segment) => Number(segment));
    const current = uploadStore.dateTime
      ? new Date(uploadStore.dateTime)
      : new Date();
    current.setHours(hours || 0, minutes || 0, 0, 0);
    uploadStore.dateTime = new Date(current).toISOString();
  }
});

const isInfoStepActive = computed(() => stepper.isCurrent('info'));
</script>

<template>
  <div class="max-w-1/3!">
    <template v-if="!accountStore.user">
      <h1 class="text-xl sm:text-2xl">
        <TranslatedText identifier="upload.title" />
      </h1>
      <p class="font-medium text-sm sm:text-base">
        <TranslatedText identifier="upload.login_required" />
      </p>
    </template>

    <template v-else-if="!accountStore.user.isEmailVerified">
      <h1 class="text-xl sm:text-2xl">
        <TranslatedText identifier="upload.title" />
      </h1>
      <p class="font-medium text-sm sm:text-base">
        <TranslatedText identifier="upload.email_verification_required" />
      </p>
    </template>

    <template v-else>
      <h1 class="text-lg sm:text-xl font-bold mb-2">
        <TranslatedText :identifier="stepper.current.value.title" />
      </h1>

      <form
        class="flex flex-col gap-4"
        @submit.prevent="submitOrNext"
      >
        <template v-if="stepper.isCurrent('file')">
          <Dropzone
            :accept="soundAccept"
            :multiple="true"
            @drop="onSoundDrop"
          >
            <template #dragging>
              <div class="text-center py-8">
                <div class="text-4xl mb-2">📁</div>
                <p class="text-sm sm:text-base font-medium">
                  <TranslatedText identifier="upload.drop_files_here" />
                </p>
              </div>
            </template>

            <div class="flex flex-col items-center gap-y-4 py-6">
              <div class="text-5xl">🎵</div>
              <div class="text-center px-4">
                <p class="text-sm sm:text-base font-medium mb-2">
                  <TranslatedText identifier="upload.select_or_drag_files" />
                </p>
                <p class="text-xs sm:text-sm text-gray-600 mb-1">
                  <TranslatedText identifier="upload.select_multiple_audio" />
                </p>
                <p class="text-xs sm:text-sm text-gray-500">
                  <TranslatedText identifier="upload.audio_formats" />
                </p>
              </div>
            </div>
          </Dropzone>

          <!-- File List Outside Dropzone -->
          <ul
            v-if="uploadStore.parts?.length"
            class="flex flex-col w-full gap-3 mt-2"
            @click.stop
          >
            <li
              v-for="(file, index) in uploadStore.parts?.map((p) => p.file)"
              :key="file.name"
              class="flex flex-row w-full items-center gap-3 p-3 bg-white border-2 border-gray-200 rounded-lg shadow-sm"
            >
              <MaterialIcon
                class="h-10 sm:h-12 shrink-0 text-blue-500"
                :filename="file.name"
              />
              <div class="flex flex-col min-w-0 flex-1">
                <p class="text-sm sm:text-base font-medium truncate">
                  {{ file.name }}
                </p>
                <p class="text-xs sm:text-sm text-gray-500">
                  {{ (file.size / 1_000_000).toFixed(2) }} MB
                </p>
              </div>
              <button
                type="button"
                class="danger-text text-sm sm:text-base px-3 py-2 touch-manipulation shrink-0 font-medium"
                @click="uploadStore.parts?.splice(index, 1)"
              >
                ✕
              </button>
            </li>
          </ul>
        </template>

        <!-- Location Stage -->
        <template v-if="stepper.isCurrent('location')">
          <div class="flex flex-col gap-4">
            <div class="info-card">
              <div class="text-2xl mb-2">📍</div>
              <p class="text-sm sm:text-base">
                <TranslatedText identifier="upload.map_instructions" />
              </p>
            </div>

            <ul class="space-y-3">
              <li
                v-for="(part, index) in uploadStore.parts"
                :key="index"
                class="location-item"
                :class="{
                  'location-item-active': index == currentPartIndex
                }"
                :style="{
                  borderLeftColor: colors[index]
                }"
              >
                <div
                  class="location-marker"
                  :style="{ backgroundColor: colors[index] }"
                />
                <div class="flex-1 min-w-0">
                  <p class="text-xs sm:text-sm font-medium truncate mb-1">
                    {{ part.file.name }}
                  </p>
                  <p class="text-xs sm:text-sm text-gray-600">
                    <TextualCoords
                      v-if="part.location"
                      :lat="part.location.lat"
                      :lng="part.location.lng"
                      type="municipality_part"
                    />
                    <template v-else>
                      <TranslatedText identifier="upload.location_not_set" />
                    </template>
                  </p>
                </div>
              </li>
            </ul>

            <!-- Embedded Map for Mobile -->
            <div
              v-if="!isDesktop"
              class="map-container"
            >
              <RecordingsMap />
            </div>

            <!-- Desktop instruction -->
            <div
              v-else
              class="info-card bg-gray-50 border-gray-300"
            >
              <p class="text-xs sm:text-sm text-gray-700">
                💡 Klikněte na mapu na pozadí pro výběr lokace
              </p>
            </div>
          </div>
        </template>

        <!-- Info Stage -->
        <template v-if="stepper.isCurrent('info')">
          <section>
            <!-- <div class="recording-details-heading">
            <p class="details-heading">
              <TranslatedText identifier="upload.details.heading" />
            </p>
            <p class="details-subheading">
              <TranslatedText identifier="upload.steps.info" />
            </p>
          </div> -->

            <div class="recording-details-form">
              <div class="details-field details-field--full">
                <label
                  for="recordingTitle"
                  class="details-label"
                >
                  <TranslatedText identifier="upload.details.name_label" />
                </label>
                <input
                  id="recordingTitle"
                  v-model="uploadStore.title"
                  type="text"
                  class="details-input"
                  :placeholder="t('upload.details.name_placeholder')"
                />
              </div>

              <div class="details-field details-field--full">
                <label
                  for="detailsComment"
                  class="details-label"
                >
                  <TranslatedText identifier="upload.details.comment_label" />
                </label>
                <textarea
                  id="detailsComment"
                  v-model="uploadStore.note"
                  class="details-input details-textarea"
                  placeholder=""
                ></textarea>
              </div>

              <div class="details-field">
                <label
                  for="recordingDate"
                  class="details-label"
                >
                  <TranslatedText identifier="upload.details.date_label" />
                </label>
                <input
                  id="recordingDate"
                  v-model="dateInputValue"
                  type="date"
                  class="details-input"
                />
              </div>

              <div class="details-field">
                <label
                  for="recordingTime"
                  class="details-label"
                >
                  <TranslatedText identifier="upload.details.time_label" />
                </label>
                <input
                  id="recordingTime"
                  v-model="timeInputValue"
                  type="time"
                  class="details-input"
                />
              </div>

              <div class="details-field details-field--full">
                <div class="details-label-row">
                  <label class="details-label">
                    <TranslatedText identifier="upload.bird_count_label" />
                  </label>
                  <span class="details-bird-value">
                    <template v-if="uploadStore.birdCount < 3">
                      {{ uploadStore.birdCount }}
                    </template>
                    <template v-else>
                      <TranslatedText identifier="upload.details.slider_more" />
                    </template>
                  </span>
                </div>
                <div class="bird-slider-wrapper">
                  <input
                    v-model.number="uploadStore.birdCount"
                    type="range"
                    min="1"
                    max="3"
                    step="1"
                    class="bird-slider"
                    :style="{
                      '--slider-progress':
                        ((uploadStore.birdCount - 1) / 2) * 100 + '%'
                    }"
                  />
                  <div class="bird-slider-labels">
                    <span>1</span>
                    <span>2</span>
                    <span>
                      <TranslatedText identifier="upload.details.slider_more" />
                    </span>
                  </div>
                </div>
              </div>

              <div class="details-field details-field--full">
                <div class="details-toggle-card">
                  <p class="details-toggle-text">
                    <TranslatedText
                      identifier="upload.details.notifications_label"
                    />
                  </p>
                  <label class="toggle-switch">
                    <input
                      v-model="uploadStore.notificationsOptIn"
                      type="checkbox"
                      class="toggle-switch-input"
                    />
                    <span
                      class="toggle-switch-track"
                      :class="{
                        'toggle-switch-track--active':
                          uploadStore.notificationsOptIn
                      }"
                    >
                      <span class="toggle-switch-thumb" />
                    </span>
                  </label>
                </div>

                <div class="details-toggle-card">
                  <p class="details-toggle-text">
                    <TranslatedText
                      identifier="upload.details.confirm_upload_label"
                    />
                  </p>
                  <label class="toggle-switch">
                    <input
                      v-model="uploadStore.confirmUpload"
                      type="checkbox"
                      class="toggle-switch-input"
                    />
                    <span
                      class="toggle-switch-track"
                      :class="{
                        'toggle-switch-track--active': uploadStore.confirmUpload
                      }"
                    >
                      <span class="toggle-switch-thumb" />
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </section>
        </template>

        <!-- Photos Stage -->
        <template v-if="stepper.isCurrent('photos')">
          <Dropzone
            :multiple="true"
            :accept="photoAccept"
            @drop="onPhotoDrop"
          >
            <template #dragging>
              <div class="text-center py-8">
                <div class="text-4xl mb-2">📷</div>
                <p class="text-sm sm:text-base font-medium">
                  <TranslatedText identifier="upload.drop_files_here" />
                </p>
              </div>
            </template>

            <div class="flex flex-col items-center gap-y-4 py-6">
              <div class="text-5xl">📸</div>
              <div class="text-center px-4">
                <p class="text-sm sm:text-base font-medium">
                  <TranslatedText identifier="upload.select_or_drag_photos" />
                </p>
                <p class="text-xs sm:text-sm text-gray-500 mt-1">(Volitelné)</p>
              </div>
            </div>
          </Dropzone>

          <!-- Photo List Outside Dropzone -->
          <ul
            v-if="uploadStore.photos?.length"
            class="flex flex-col w-full gap-4 mt-4"
            @click.stop
          >
            <li
              v-for="(file, index) in uploadStore.photos"
              :key="file.name"
              class="flex flex-col sm:flex-row w-full items-center gap-3 p-3 bg-white border-2 border-gray-200 rounded-lg shadow-sm"
            >
              <img
                :src="makeURL(file)"
                class="w-full sm:w-32 h-32 object-cover rounded"
              />
              <div class="flex-1 text-center sm:text-left">
                <p class="text-sm font-medium">
                  {{ file.name }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ (file.size / 1_000_000).toFixed(2) }} MB
                </p>
              </div>
              <button
                type="button"
                class="danger w-full sm:w-auto px-4 py-2 text-sm touch-manipulation"
                @click="uploadStore.photos?.splice(index, 1)"
              >
                <TranslatedText identifier="upload.remove" />
              </button>
            </li>
          </ul>
        </template>

        <template v-if="stepper.isCurrent('submit')">
          <div
            class="flex flex-col gap-6 items-center justify-center py-12 px-4"
          >
            <template v-if="uploadSuccess">
              <div class="text-7xl sm:text-8xl">✅</div>
              <div class="text-center">
                <p class="text-xl sm:text-2xl font-bold text-green-600 mb-3">
                  <TranslatedText identifier="upload.success.queued" />
                </p>
                <p class="text-sm sm:text-base text-gray-600 mb-2">
                  <TranslatedText identifier="upload.success.background" />
                </p>
                <p class="text-sm sm:text-base text-gray-600">
                  <TranslatedText identifier="upload.success.track_status" />
                </p>
              </div>
            </template>
            <template v-else>
              <div class="text-5xl animate-pulse">⏳</div>
              <p class="text-base sm:text-lg font-medium">
                <TranslatedText identifier="upload.preparing" />
              </p>
            </template>
          </div>
        </template>

        <div
          class="flex items-center justify-center gap-1 mb-6 overflow-x-auto px-2"
        >
          <div
            v-for="(step, id, i) in stepper.steps.value"
            :key="id"
            class="flex items-center shrink-0"
          >
            <button
              :disabled="!allStepsBeforeAreValid(i) && stepper.isBefore(id)"
              class="step-indicator touch-manipulation"
              :class="{
                'step-active': stepper.isCurrent(id),
                'step-completed': stepper.isAfter(id) && step.isValid(),
                'step-incomplete': stepper.isAfter(id) && !step.isValid(),
                'step-pending':
                  stepper.isBefore(id) && allStepsBeforeAreValid(i),
                'step-disabled':
                  !allStepsBeforeAreValid(i) && stepper.isBefore(id)
              }"
              :title="step.title"
              @click="stepper.goTo(id)"
            >
              <span class="step-number">{{ i + 1 }}</span>
            </button>
            <div
              v-if="i < Object.keys(stepper.steps.value).length - 1"
              class="step-connector"
              :class="{
                'step-connector-completed':
                  stepper.isAfter(id) && step.isValid(),
                'step-connector-active': stepper.isCurrent(id)
              }"
            />
          </div>
        </div>

        <!-- Navigation Buttons -->
        <div class="nav-buttons">
          <button
            v-if="!stepper.isFirst.value && !stepper.isLast.value"
            type="button"
            class="secondary flex-1 sm:flex-none py-3 px-6 text-sm sm:text-base touch-manipulation font-medium"
            @click="stepper.goToPrevious()"
          >
            ← <TranslatedText identifier="upload.back" />
          </button>
          <button
            v-if="!stepper.isLast.value"
            type="submit"
            :disabled="
              !(
                stepper.current.value.isValid() &&
                allStepsBeforeAreValid(stepper.index.value)
              )
            "
            class="primary flex-1 sm:flex-none py-3 px-6 text-sm sm:text-base touch-manipulation font-medium"
          >
            <TranslatedText identifier="upload.next" /> →
          </button>
        </div>
      </form>
    </template>
  </div>
</template>

<style scoped>
@reference "../../styles/main.css";

.step-indicator {
  @apply w-8 h-8 sm:w-10 sm:h-10 rounded-lg border-2 bg-white;
  @apply flex items-center justify-center;
  @apply transition-all duration-200;
  @apply cursor-pointer;
}

/* Default/Pending state - can be clicked if previous steps valid */
.step-pending {
  @apply border-gray-300 bg-white;
}

.step-pending:hover:not(:disabled) {
  @apply border-yellow-400 shadow-sm;
}

.step-pending .step-number {
  @apply text-gray-500;
}

/* Disabled state - previous steps not valid */
.step-disabled {
  @apply border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed;
}

.step-disabled .step-number {
  @apply text-gray-400;
}

/* Active/Current state */
.step-active {
  @apply border-yellow-300 bg-yellow-300 shadow-md;
}

.step-active .step-number {
  @apply text-white font-bold;
}

/* Completed state - valid and past */
.step-completed {
  @apply border-yellow-500 bg-yellow-500 cursor-pointer;
}

.step-completed:hover {
  @apply shadow-md scale-105;
}

.step-completed .step-number {
  @apply text-white font-semibold;
}

/* Incomplete state - invalid and past */
.step-incomplete {
  @apply border-red-500 bg-red-50 cursor-pointer;
}

.step-incomplete:hover {
  @apply shadow-md border-red-600;
}

.step-incomplete .step-number {
  @apply text-red-600 font-semibold;
}

.step-number {
  @apply text-sm sm:text-base font-medium;
}

.step-connector {
  @apply w-6 sm:w-10 h-0.5 bg-gray-300 transition-all duration-200;
}

.step-connector-active {
  @apply bg-yellow-400;
}

.step-connector-completed {
  @apply bg-yellow-500;
}

.info-card {
  @apply p-4 bg-blue-50 border-2 border-blue-200 rounded-lg;
}

.location-item {
  @apply flex items-center gap-3 p-3 bg-white border-l-4 border-gray-300 rounded-lg shadow-sm;
  @apply transition-all duration-200;
}

.location-item-active {
  @apply bg-blue-50 border-blue-500 shadow-md;
}

.location-marker {
  @apply w-8 h-8 rounded-full shrink-0;
  @apply border-2 border-white shadow-md;
}

.form-section {
  @apply w-full;
}

.form-label {
  @apply block text-sm sm:text-base font-medium text-gray-700 mb-2;
}

.form-input {
  @apply w-full px-4 py-3 text-sm sm:text-base;
  @apply border-2 border-gray-300 rounded-lg;
  @apply focus:border-blue-500 focus:ring-2 focus:ring-blue-200;
  @apply transition-all duration-200 touch-manipulation;
}

.confirmation-box {
  @apply flex items-start gap-3 p-4;
  @apply bg-yellow-50 border-2 border-yellow-300 rounded-lg;
}

.confirmation-checkbox {
  @apply mt-0.5 w-6 h-6 shrink-0 touch-manipulation;
  @apply text-blue-600 border-2 border-gray-300 rounded;
  @apply focus:ring-2 focus:ring-blue-200;
}

.nav-buttons {
  @apply flex flex-row justify-between w-full mt-6 gap-3;
}

.danger-text {
  @apply text-red-500 hover:text-red-700;
}

.map-container {
  @apply flex w-full rounded-lg overflow-hidden border-2 border-gray-300 shadow-lg;
  @apply relative;
  height: 400px;
  min-height: 400px;
}

@media (max-height: 700px) {
  .map-container {
    height: 300px;
    min-height: 300px;
  }
}

.recording-details-card {
  @apply w-full bg-white rounded-[30px] p-6 sm:p-10 border border-gray-100 flex flex-col gap-6;
  box-shadow: 0 30px 60px rgba(15, 23, 42, 0.15);
}

.recording-details-heading {
  @apply flex flex-col gap-1 text-left;
}

.details-heading {
  @apply text-2xl font-bold text-gray-900;
}

.details-subheading {
  @apply text-sm text-gray-500 font-medium;
}

.recording-details-form {
  @apply grid gap-5;
}

@media (min-width: 640px) {
  .recording-details-form {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .details-field--full {
    grid-column: span 2 / span 2;
  }
}

.details-field {
  @apply flex flex-col gap-2;
}

.details-label {
  @apply text-sm font-semibold text-gray-600;
}

.details-input {
  @apply w-full rounded-2xl border border-gray-200 bg-gray-50 text-gray-900 text-base px-4 py-3;
  @apply focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:bg-white transition;
}

.details-textarea {
  min-height: 130px;
  resize: none;
}

.details-label-row {
  @apply flex items-center justify-between;
}

.details-bird-value {
  @apply text-base font-semibold text-gray-900;
}

.bird-slider-wrapper {
  @apply flex flex-col gap-2;
}

.bird-slider {
  --slider-progress: 0%;
  @apply w-full h-3 rounded-full appearance-none cursor-pointer;
  background: linear-gradient(
    90deg,
    #ffd400 0%,
    #ffd400 var(--slider-progress),
    #e5e7eb var(--slider-progress),
    #e5e7eb 100%
  );
}

.bird-slider::-webkit-slider-thumb {
  appearance: none;
  width: 24px;
  height: 24px;
  border-radius: 9999px;
  background: #ffd400;
  border: 3px solid #fff;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.bird-slider::-moz-range-thumb {
  width: 24px;
  height: 24px;
  border-radius: 9999px;
  background: #ffd400;
  border: 3px solid #fff;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.bird-slider-labels {
  @apply flex justify-between text-xs uppercase tracking-wide text-gray-400 font-semibold;
}

.details-toggle-card {
  @apply flex items-center justify-between gap-4 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm;
}

.details-toggle-text {
  @apply text-sm sm:text-base font-medium text-gray-800;
  @apply flex-1 min-w-0 wrap-anywhere;
}

.toggle-switch {
  @apply relative inline-flex items-center cursor-pointer;
}

.toggle-switch-input {
  @apply sr-only;
}

.toggle-switch-track {
  @apply w-14 h-8 rounded-full bg-gray-200 flex items-center px-1 transition-colors duration-200;
}

.toggle-switch-track--active {
  background-color: #ffd400;
}

.toggle-switch-thumb {
  @apply w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-200;
  transform: translateX(0);
}

.toggle-switch-track--active .toggle-switch-thumb {
  transform: translateX(1.5rem);
}

.details-primary-button {
  @apply w-full text-center font-semibold text-base sm:text-lg py-4 rounded-full transition;
  background-color: #ffd400;
  color: #1f2937;
  box-shadow: 0 12px 24px rgba(255, 212, 0, 0.35);
}

.details-primary-button:disabled {
  @apply opacity-60 cursor-not-allowed;
  box-shadow: none;
}
</style>
