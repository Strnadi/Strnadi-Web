<route>
meta:
  layout: desktop/center
</route>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted, reactive } from 'vue';
import { onBeforeRouteUpdate, onBeforeRouteLeave } from 'vue-router';
import { accountStore } from "@/state/AccountStore";
import { MapEvents, MapMarkers } from '@/views/Map.vue';
import { useStepper } from '@vueuse/core';
import { postRecording, type RecordingUploadReq, type RecordingPartUploadParams } from '@/api/recordings';
import { useQueryClient, useMutation, useMutationState } from '@tanstack/vue-query';
import { Icon, type LeafletMouseEvent, divIcon } from 'leaflet';
import Dropzone from '@/components/Dropzone.vue';
import MaterialIcon from '@/components/MaterialIcon.vue';
import TextualCoords from '@/components/map/TextualCoords.vue';

import "@vuepic/vue-datepicker/dist/main.css";


interface LatLng {
  lat: number;
  lng: number;
};

interface RecordingPart {
  file: File;
  location: LatLng | null;
};

const uploadStore = reactive({
  parts: null as RecordingPart[] | null,
  photos: null as File[] | null,
  dialects: [] as string[],
  note: "" as string | null,
  title: "" as string,
  device: "" as string | null,
  birdCount: 1,
  dateTime: new Date().toISOString(),
  confirmUpload: false,

  setRecordings(recordings: File[]) {
    this.parts ??= [];

    this.parts?.push(
      ...recordings.map((recording) => ({
        file: recording,
        location: null
      })) as RecordingPart[]
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
    this.title = "";
    this.device = null;
    this.birdCount = 1;
    this.dateTime = new Date().toISOString();
  }

});

const queryClient = useQueryClient();

const dialect = ref("");
const error = ref<string | null>(null);

const soundAccept = [
  "audio/*",
  "application/ogg",
  "application/vorbis"
];

const photoAccept = "image/*";

type StepIdentifier = 'file' | 'photos' | 'location' | 'info' | 'submit';

interface Step {
  title: string;
  isValid: () => boolean;
  before?: () => void;
  after?: () => void;
};

const colors = computed(() => Array.from(
  {length: uploadStore.parts?.length ?? 0},
  () => '#'+(Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0')
));

const makeSelectedIcon = (partIndex: number) =>
  divIcon({
    className: "my-custom-pin",
    iconSize: [24, 24],
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

const handleMapClick = (event: LeafletMouseEvent) => {
  MapMarkers.addMarker(
    `selected-part-${currentPartIndex.value}`,
    event.latlng,
    makeSelectedIcon(currentPartIndex.value)
  );

  uploadStore.parts![currentPartIndex.value].location = event.latlng;
  currentPartIndex.value = (currentPartIndex.value + 1) % (uploadStore.parts?.length ?? 0);


  return false;
}

// Define the steps for the upload process
const stepper = useStepper<Record<StepIdentifier, Step>>({
  'file': {
    title: 'Soubory',
    isValid: () => (uploadStore.parts?.length ?? 0) > 0 && (uploadStore.parts?.every(part => part.file) ?? false),
  },

  'photos': {
    title: 'Fotky',
    isValid: () => true,
  },

  'location': {
    title: 'Poloha',
    isValid: () => (uploadStore.parts?.every(part => part.location) ?? false),
    before: () => {
      MapEvents.on("map-click", handleMapClick);
    },
    after: () => {
      MapEvents.off("map-click", handleMapClick);
    }
  },

  'info': {
    title: 'Informace o nahrávce',
    isValid: () => !!uploadStore.dateTime && uploadStore.confirmUpload,
  },

  'submit': {
    title: 'Odeslat',
    isValid: () => true, // Final step, always valid to view
  }
});

watch(
  () => stepper.current.value,
  (newStep, oldStep) => {
    if ("after" in oldStep) oldStep.after();
    if ("before" in newStep) newStep.before();
  }
);


const beforeWindowUnload = (event: BeforeUnloadEvent) => {
  event.preventDefault();
  event.returnValue = true;
};

const removeMarkers = () => {
  for(let i = 0; i < (uploadStore.parts?.length ?? 0); i++) {
    MapMarkers.removeMarker(`selected-part-${i}`);
  }
}

const {
  mutate: submitRecording,
  error: uploadError,
  isPending,
} = useMutation({
  mutationFn: ({
    token,
    recording,
    parts,
    photos
  }: {
    token: string;
    recording: RecordingUploadReq;
    parts: RecordingPartUploadParams[];
    photos?: File[];
  }) => postRecording(token, recording, parts, photos),

  onMutate() {
    window.addEventListener("beforeunload", beforeWindowUnload);
  },

  onSettled() {
    window.removeEventListener("beforeunload", beforeWindowUnload)
    queryClient.invalidateQueries({ queryKey: ["all-recordings"] });
    stepper.goTo("file");

    removeMarkers();
  }
});

onUnmounted(removeMarkers);

// useMutationState({
//   select: (mutation) => mutation.state.status
// })

const submit = () => {
  const recording = {
    createdAt: new Date().toISOString(),
    estimatedBirdsCount: uploadStore.birdCount,
    device: uploadStore.device || "",
    name: uploadStore.title,
    byApp: false,
    note: uploadStore.note,
  };

  // Each file is treated as a separate recording part
  const recordingParts = uploadStore.parts!.map(
    ({ file, location }) =>
      ({
        startDate: uploadStore.dateTime,
        endDate: uploadStore.dateTime,
        gpsLatitudeStart: location!.lat,
        gpsLatitudeEnd: location!.lat,
        gpsLongitudeStart: location!.lng,
        gpsLongitudeEnd: location!.lng,
        data: file,
      } as RecordingPartUploadParams)
  );

  submitRecording({
    token: accountStore.token!,
    recording: recording,
    parts: recordingParts,
    photos: uploadStore.photos ?? []
  });
};

const stillUploading = () => {
  if(isPending.value) {
    alert("Nahrávání stále probíhá. Nezavírejte stránku.");
    return false;
  }
}

onBeforeRouteUpdate(stillUploading);
onBeforeRouteLeave(stillUploading);


function submitOrNext() {
  if (stepper.current.value.isValid()) {
    if (stepper.isLast.value) {
      submit();
    } else {
      stepper.goToNext();
    }
  }
}

const onSoundDrop = (acceptedFiles: File[]) => {
  if (acceptedFiles.length === 0) {
    error.value = "Žádné validní soubory nebyly vybrány.";
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
  return (
    !Array
      .from({ length: index }, () => null)
      .some((_, i) => !stepper.at(i)?.isValid())
  )
}

const addDialect = () => {
  if (dialect.value && dialect.value != "none" && !uploadStore.dialects.includes(dialect.value)) {
    uploadStore.dialects.push(dialect.value);
    dialect.value = "none";
  }
};

const currentPartIndex = ref(0);


const totalSteps = Object.keys(stepper.steps.value).length -1;

</script>

<template>
  <template v-if="!accountStore.user">
    <h1 class="text-2xl">
      Nahrát
    </h1>
    <p class="font-medium">
      Je potřeba se nejdříve přihlásit.
    </p>
  </template>

  <template v-else-if="!accountStore.user.isEmailVerified">
    <h1 class="text-2xl">
      Nahrát
    </h1>
    <p class="font-medium">
      Je potřeba si nejdříve ověřit svůj e-mail.
    </p>
  </template>

  <template v-else>
    <h1
      class="text-lg font-bold mb-4"
      v-text="stepper.current.value.title"
    />

    <template v-if="uploadError">
      <span>{{ uploadError }}</span>
    </template>

    <form @submit.prevent="submitOrNext">
      <template v-if="stepper.isCurrent('file')">
        <Dropzone
          :accept="soundAccept"
          :multiple="true"
          @drop="onSoundDrop"
        >
          <template #dragging>
            <p>Upusťte soubory sem pro nahrání</p>
          </template>

          <div class="flex flex-col items-center gap-y-1">
            <div>
              <p>Přetáhněte nebo klikněte sem pro vybrání</p>
              <p>jednoho nebo několika zvukových souborů</p>
            </div>
            <p>(.wav, .mp3, .flac, .aac, .ogg)</p>

            <ul
              class="flex flex-col w-full"
              @click.stop
            >
              <li
                v-for="(file, index) in uploadStore.parts?.map(p => p.file)"
                :key="file.name"
                class="flex flex-row w-full items-center justify-between"
              >
                <MaterialIcon
                  class="h-10"
                  :filename="file.name"
                />
                <div class="flex flex-col">
                  <p>{{ file.name }}</p>
                  <p>{{ file.size / 1_000_000 }} MB</p>
                </div>
                <button
                  class="text-red-500"
                  @click="uploadStore.parts?.splice(index, 1)"
                >
                  Smazat
                </button>
              </li>
            </ul>
          </div>
        </Dropzone>
      </template>

      <!-- Photos Stage -->
      <template v-if="stepper.isCurrent('photos')">
        <Dropzone
          :multiple="true"
          :accept="photoAccept"
          @drop="onPhotoDrop"
        >
          <template #dragging>
            <p>Upusťte soubory sem pro nahrání</p>
          </template>

          <div class="flex flex-col items-center gap-y-1">
            <p>Klikněte nebo přetáhněte fotky z místa dění</p>

            <ul
              class="flex flex-col w-full"
              @click.stop
            >
              <li
                v-for="(file, index) in uploadStore.photos"
                :key="file.name"
                class="flex flex-row w-full items-center justify-between"
              >
                <img
                  :src="makeURL(file)"
                  class="h-[200px]"
                >
                <button
                  class="danger"
                  @click="uploadStore.photos?.splice(index, 1)"
                >
                  Odebrat
                </button>
              </li>
            </ul>
          </div>
        </Dropzone>
      </template>

      <!-- Location Stage -->
      <template v-if="stepper.isCurrent('location')">
        <ul>
          <li
            v-for="(part, index) in uploadStore.parts"
            :key="index"
            class="flex flex-row gap-x-2"
            :class="{
              'font-bold': index == currentPartIndex
            }"
            :style="{
              color: colors[index],
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
              <template v-else>Poloha zatím neurčena.</template>
            </span>
          </li>
        </ul>
      </template>

      <!-- Info Stage -->
      <template v-if="stepper.isCurrent('info')">
        <div class="flex flex-col w-full">
          <div class="flex flex-col gap-x-2 gap-y-4 w-full">
            <VueDatePicker
              v-model="uploadStore.dateTime"
              :flow="['calendar', 'time']"
              auto-apply
              partial-flow
              model-type="iso"
            />
            <div class="w-full">
              <label
                for="title"
                class="block text-sm font-medium w-full"
              >Titulek</label>
              <input
                id="title"
                v-model="uploadStore.title"
                type="text"
                class="w-full"
              >
            </div>
            <div>
              <label
                for="note"
                class="block text-sm font-medium"
              >Poznámka</label>
              <textarea
                id="note"
                v-model="uploadStore.note"
                class="w-full"
              />
            </div>
            <div>
              <label
                for="device"
                class="block text-sm font-medium"
              >Nahrávací zařízení</label>
              <input
                id="device"
                v-model="uploadStore.device"
                type="text"
                class="w-full"
              >
            </div>
            <div>
              <label
                for="birdCount"
                class="block text-sm font-medium"
              >Počet strnadů ({{ uploadStore.birdCount }})</label>
              <input
                id="birdCount"
                v-model="uploadStore.birdCount"
                min="1"
                max="2"
                type="range"
              >
            </div>
          </div>
          <div>
            <select
              v-model="dialect"
              class="!bg-transparent drop-shadow-sm m-2 hover:bg-gray-100 bg-white p-2"
            >
              <option value="none">
                Bez dialektu
              </option>
              <option value="BC">
                BC
              </option>
              <option value="BE">
                BE
              </option>
              <option value="BlBh">
                BlBh
              </option>
              <option value="BhBl">
                BhBl
              </option>
              <option value="XB">
                XB
              </option>
            </select>
            <button
              class="secondary p-2"
              :disabled="!dialect || dialect == 'none'"
              @click="addDialect"
            >
              Přidat dialekt
            </button>
          </div>

          <div
            v-if="uploadStore.dialects.length > 0"
            class="flex flex-col gap-y-2"
          >
            <h2>Nářečí</h2>
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


          <h2>Části nahrávky</h2>
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
                Odebrat
              </button>
            </li>
          </ul>

          <div class="flex flex-row items-center gap-x-2">
            <input
              v-model="uploadStore.confirmUpload"
              class="h-full"
              type="checkbox"
            >
            <p class="text-gray-500">
              Nahrávku jsem zkontroloval(a) a chci ji odeslat do<br> databáze. Jsem si vědom(a) tím, že v ní zůstane
              i po smazání mého<br> účtu a že smazána bude jen ve vyjimečných případech.
            </p>
          </div>
        </div>
      </template>

      <template v-if="stepper.isCurrent('submit')">
        <p>Odesílání vaší nahrávky do databáze...</p>
      </template>

      <!-- Navigation Buttons -->
      <div class="flex justify-between mt-4">
        <button
          type="button"
          :disabled="stepper.isFirst.value"
          class="secondary p-2"
          @click="stepper.goToPrevious()"
        >
          Zpět
        </button>
        <button
          type="submit"
          :disabled="!(stepper.current.value.isValid() && allStepsBeforeAreValid(stepper.index.value))"
          class="primary p-2"
        >
          Další
        </button>
      </div>
    </form>

    <!-- Step Indicators -->
    <div class="flex gap-2 my-4 justify-center">
      <div
        v-for="(step, id, i) in stepper.steps.value"
        :key="id"
      >
        <button
          :disabled="!allStepsBeforeAreValid(i) && stepper.isBefore(id)"
          class="text-sm text-gray-500 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
          :class="{
            'text-gray-900 font-bold': stepper.isCurrent(id),
            'text-green-600': stepper.isAfter(id) && step.isValid(), // Mark completed steps
            'text-red-600': stepper.isAfter(id) && !step.isValid(), // Mark invalid past steps
          }"
          @click="stepper.goTo(id)"
          v-text="step.title"
        />
      </div>
    </div>
  </template>
</template>
