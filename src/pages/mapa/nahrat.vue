<route lang="yaml">
meta:
  layout: desktop/center
</route>

<script lang="ts">
import { ref, watch, computed, onUnmounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { accountStore } from '@/state/AccountStore';
import {
  MapEvents,
  type MapClickEvent,
  MapStore
} from '@/views/map/RecordingsMap.vue';
import { useStepper } from '@vueuse/core';
import { type RecordingPartUploadParams } from '@/api/recordings';
import { useQueryClient } from '@tanstack/vue-query';
import { divIcon, type Icon } from 'leaflet';
import { uploadQueueStore } from '@/state/UploadStore';

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
  }
});
</script>

<script setup lang="ts">
import Dropzone from '@/components/Dropzone.vue';
import MaterialIcon from '@/components/MaterialIcon.vue';
import TextualCoords from '@/components/map/TextualCoords.vue';
import TranslatedText, { t } from '@/components/TranslatedText.vue';
import type { TranslationIdentifier } from '@/constants/Translations';

const queryClient = useQueryClient();
const router = useRouter();

const dialect = ref('');
const error = ref<string | null>(null);
const isSubmitting = ref(false);
const uploadSuccess = ref(false);

const photoAccept = 'image/*';

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
      uploadStore.confirmUpload &&
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
    note: uploadStore.note
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

const addDialect = () => {
  if (
    dialect.value &&
    dialect.value != 'none' &&
    !uploadStore.dialects.includes(dialect.value)
  ) {
    uploadStore.dialects.push(dialect.value);
    dialect.value = 'none';
  }
};

const currentPartIndex = ref(0);
</script>

<template>
  <template v-if="!accountStore.user">
    <h1 class="text-2xl">
      <TranslatedText identifier="upload.title" />
    </h1>
    <p class="font-medium">
      <TranslatedText identifier="upload.login_required" />
    </p>
  </template>

  <template v-else-if="!accountStore.user.isEmailVerified">
    <h1 class="text-2xl">
      <TranslatedText identifier="upload.title" />
    </h1>
    <p class="font-medium">
      <TranslatedText identifier="upload.email_verification_required" />
    </p>
  </template>

  <template v-else>
    <h1 class="text-lg font-bold mb-4">
      <TranslatedText :identifier="stepper.current.value.title" />
    </h1>

    <form @submit.prevent="submitOrNext">
      <template v-if="stepper.isCurrent('file')">
        <Dropzone :accept="soundAccept" :multiple="true" @drop="onSoundDrop">
          <template #dragging>
            <p><TranslatedText identifier="upload.drop_files_here" /></p>
          </template>

          <div class="flex flex-col items-center gap-y-1">
            <div>
              <p><TranslatedText identifier="upload.select_or_drag_files" /></p>
              <p>
                <TranslatedText identifier="upload.select_multiple_audio" />
              </p>
            </div>
            <p><TranslatedText identifier="upload.audio_formats" /></p>

            <ul class="flex flex-col w-full" @click.stop>
              <li
                v-for="(file, index) in uploadStore.parts?.map((p) => p.file)"
                :key="file.name"
                class="flex flex-row w-full items-center justify-between"
              >
                <MaterialIcon class="h-10" :filename="file.name" />
                <div class="flex flex-col">
                  <p>{{ file.name }}</p>
                  <p>{{ file.size / 1_000_000 }} MB</p>
                </div>
                <button
                  class="text-red-500"
                  @click="uploadStore.parts?.splice(index, 1)"
                >
                  <TranslatedText identifier="upload.delete" />
                </button>
              </li>
            </ul>
          </div>
        </Dropzone>
      </template>

      <!-- Location Stage -->
      <template v-if="stepper.isCurrent('location')">
        <div class="flex flex-col gap-y-4">
          <ul>
            <li
              v-for="(part, index) in uploadStore.parts"
              :key="index"
              class="flex flex-row gap-x-2"
              :class="{
                'font-bold': index == currentPartIndex
              }"
              :style="{
                color: colors[index]
              }"
            >
              <!-- <audio :src="partURLs[index]" controls /> -->
              <span>{{ part.file.name }}</span>
              <span>
                <TextualCoords
                  v-if="part.location"
                  :lat="part.location.lat"
                  :lng="part.location.lng"
                  type="municipality_part"
                />
                <template v-else
                  ><TranslatedText identifier="upload.location_not_set"
                /></template>
              </span>
            </li>
          </ul>
          <p><TranslatedText identifier="upload.map_instructions" /></p>
        </div>
      </template>

      <!-- Info Stage -->
      <template v-if="stepper.isCurrent('info')">
        <div class="flex flex-col w-full">
          <div class="flex flex-col gap-x-2 gap-y-4 w-full">
            <VueDatePicker
              v-model="uploadStore.dateTime"
              :flow="['year', 'month', 'calendar', 'time']"
              auto-apply
              partial-flow
              model-type="iso"
            />
            <div class="w-full">
              <label for="title" class="block text-sm font-medium w-full"
                ><TranslatedText identifier="upload.title_label"
              /></label>
              <input
                id="title"
                v-model="uploadStore.title"
                type="text"
                class="w-full p-2"
              />
            </div>
            <div>
              <label for="note" class="block text-sm font-medium"
                ><TranslatedText identifier="upload.note_label"
              /></label>
              <textarea id="note" v-model="uploadStore.note" class="w-full" />
            </div>
            <div>
              <label for="device" class="block text-sm font-medium"
                ><TranslatedText identifier="upload.device_label"
              /></label>
              <input
                id="device"
                v-model="uploadStore.device"
                type="text"
                class="w-full"
              />
            </div>
            <div>
              <label for="birdCount" class="block text-sm font-medium">
                <TranslatedText identifier="upload.bird_count_label" />
                ({{ uploadStore.birdCount }})
              </label>
              <input
                id="birdCount"
                v-model="uploadStore.birdCount"
                min="1"
                max="2"
                type="range"
              />
            </div>
          </div>

          <div
            v-if="uploadStore.dialects.length > 0"
            class="flex flex-col gap-y-2"
          >
            <h2><TranslatedText identifier="upload.dialects" /></h2>
            <ul class="flex flex-row gap-x-4">
              <li
                v-for="(addedDialect, index) in uploadStore.dialects"
                :key="index"
                class="flex flex-row gap-x-2"
              >
                <p>{{ addedDialect }}</p>
              </li>
            </ul>
          </div>

          <h2><TranslatedText identifier="upload.parts" /></h2>
          <ul class="flex flex-col gap-y-2">
            <li
              v-for="(part, index) in uploadStore.parts"
              :key="index"
              class="flex flex-row gap-x-2 items-center"
            >
              <TextualCoords
                v-if="part.location"
                :lat="part.location.lat"
                :lng="part.location.lng"
                type="municipality_part"
              />
              <!-- <audio :src="partURLs[index]" controls class="w-1/2"></audio> -->
              <button
                class="secondary px-2 py-1"
                @click="uploadStore.removePartByIndex(index)"
              >
                <TranslatedText identifier="upload.remove" />
              </button>
            </li>
          </ul>

          <div class="flex flex-row items-center gap-x-2">
            <input
              v-model="uploadStore.confirmUpload"
              class="h-full"
              type="checkbox"
            />
            <p class="text-gray-500">
              <TranslatedText identifier="upload.confirm_upload_text" />
            </p>
          </div>
        </div>
      </template>

      <!-- Photos Stage -->
      <template v-if="stepper.isCurrent('photos')">
        <Dropzone :multiple="true" :accept="photoAccept" @drop="onPhotoDrop">
          <template #dragging>
            <p><TranslatedText identifier="upload.drop_files_here" /></p>
          </template>

          <div class="flex flex-col items-center gap-y-1">
            <p><TranslatedText identifier="upload.select_or_drag_photos" /></p>

            <ul class="flex flex-col w-full" @click.stop>
              <li
                v-for="(file, index) in uploadStore.photos"
                :key="file.name"
                class="flex flex-row w-full items-center justify-between"
              >
                <img :src="makeURL(file)" class="h-[200px]" />
                <button
                  class="danger"
                  @click="uploadStore.photos?.splice(index, 1)"
                >
                  <TranslatedText identifier="upload.remove" />
                </button>
              </li>
            </ul>
          </div>
        </Dropzone>
      </template>

      <template v-if="stepper.isCurrent('submit')">
        <div class="flex flex-col gap-4 items-center justify-center p-8">
          <template v-if="uploadSuccess">
            <div class="text-6xl">✅</div>
            <p class="text-xl font-semibold text-green-600">
              <TranslatedText identifier="upload.success.queued" />
            </p>
            <p class="text-sm text-gray-600">
              <TranslatedText identifier="upload.success.background" />
            </p>
            <p class="text-sm text-gray-600">
              <TranslatedText identifier="upload.success.track_status" />
            </p>
          </template>
          <template v-else>
            <p>
              <TranslatedText identifier="upload.preparing" />
            </p>
          </template>
        </div>
      </template>

      <!-- Navigation Buttons -->
      <div class="flex flex-row-reverse justify-between w-full mt-4">
        <button
          v-if="!stepper.isLast.value"
          type="submit"
          :disabled="
            !(
              stepper.current.value.isValid() &&
              allStepsBeforeAreValid(stepper.index.value)
            )
          "
          class="primary p-2"
        >
          <TranslatedText identifier="upload.next" />
        </button>
        <button
          v-if="!stepper.isFirst.value && !stepper.isLast.value"
          type="button"
          class="secondary p-2"
          @click="stepper.goToPrevious()"
        >
          <TranslatedText identifier="upload.back" />
        </button>
      </div>
    </form>

    <!-- Step Indicators -->
    <div class="flex gap-2 my-4 justify-center">
      <div v-for="(step, id, i) in stepper.steps.value" :key="id">
        <button
          :disabled="!allStepsBeforeAreValid(i) && stepper.isBefore(id)"
          class="text-sm text-gray-500 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
          :class="{
            'text-gray-900 font-bold': stepper.isCurrent(id),
            'text-green-600': stepper.isAfter(id) && step.isValid(),
            'text-red-600': stepper.isAfter(id) && !step.isValid()
          }"
          @click="stepper.goTo(id)"
        >
          <TranslatedText :identifier="step.title" />
        </button>
      </div>
    </div>
  </template>
</template>
