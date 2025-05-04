<route lang="yaml">
meta:
  layout: desktop/center
</route>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { onBeforeRouteUpdate, onBeforeRouteLeave } from 'vue-router';
import { accountStore } from "@/state/AccountStore";
import { uploadStore } from '@/state/UploadStore';
import { mapStore } from '@/state/MapStore';
import { useStepper } from '@vueuse/core';
import { postRecording, type RecordingUploadReq, type RecordingPartUploadParams } from '@/api/recordings';
import { useMutation } from '@tanstack/vue-query';
import SegmentedProgress from '@/components/SegmentedProgress.vue';
import Dropzone from '@/components/Dropzone.vue';

import "@vuepic/vue-datepicker/dist/main.css";

const error = ref<string | null>(null);

const soundAccept = [
  "audio/*",
  "application/ogg",
  "application/vorbis"
];

const photoAccept = "image/*";

// Define the steps for the upload process
const stepper = useStepper({
  'file': {
    title: 'Soubory',
    isValid: () => (uploadStore.parts?.length ?? 0) > 0 && uploadStore.parts?.every(part => part.file),
  },
  'photos': {
    title: 'Fotky',
    isValid: () => true,
  },
  'location': {
    title: 'Poloha',
    isValid: () => uploadStore.parts?.every(part => part.location),
    beforeCallback: () => {
      mapStore.selectedLocation = null;
      mapStore.selectEnabled = true;
    },
    endCallback: () => {
      mapStore.selectedLocation = null;
      mapStore.selectEnabled = false;
    }
  },
  'info': {
    title: 'Informace o nahrávce',
    isValid: () => uploadStore.dateTime,
  },
  'final-confirm': {
    title: 'Konečné potvrzení',
    isValid: () => true
  },
  'submit': {
    title: 'Odeslat',
    isValid: () => true, // Final step, always valid to view
  }
});

const beforeWindowUnmount = (event: BeforeUnloadEvent) => {
  event.preventDefault();
  event.returnValue = true;
};

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
    window.addEventListener("beforeunload", beforeWindowUnmount);
    queryClient.invalidateQueries({ queryKey: ["all-recordings"] });
    stepper.goTo("file");
    mapStore.selectedLocation = null;
  },

  onSettled() {
    window.removeEventListener("beforeunload", beforeWindowUnmount)
  }
});

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

onBeforeRouteUpdate(() => {
  if(isPending.value == true) {
    alert("Nahrávání stále probíhá. Nezavírejte stránku.");
    return false;
  }
});

onBeforeRouteLeave(() => {
  if(isPending.value == true) {
    alert("Nahrávání stále probíhá. Nezavírejte stránku.");
    return false;
  }
});

onUnmounted(() => {
  stepper.goTo('file');
});

function submitOrNext() {
  if (stepper.current.value.isValid()) {
    if (stepper.isLast.value) {
      submit();
    } else {
      stepper.goToNext();
    }
  }
}

const onSoundDrop = (acceptedFiles: any[]) => {
  if (acceptedFiles.length === 0) {
    error.value = "Žádné validní soubory nebyly vybrány.";
    return;
  }

  uploadStore.setRecordings(acceptedFiles);
  stepper.goToNext();
};

const onPhotoDrop = (acceptedFiles: File[]) => {
  if(!Array.isArray(uploadStore.photos))
    uploadStore.photos = [];

  uploadStore.photos?.push(...acceptedFiles);
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

watch(() => mapStore.selectedLocation, (newLocation: LatLng | null) => {
  if (newLocation) {
    uploadStore.parts![currentPartIndex.value].location = newLocation;
    currentPartIndex.value++;
  }
});

const totalSteps = Object.keys(stepper.steps.value).length -1;

</script>

<template>
  <template v-if="!accountStore.user">
    <h1 class="text-2xl">Nahrát</h1>
    <p class="font-medium">Je potřeba se nejdříve přihlásit.</p>
  </template>

  <template v-else-if="!accountStore.user.isEmailVerified">
    <h1 class="text-2xl">Nahrát</h1>
    <p class="font-medium">Je potřeba si nejdříve ověřit svůj e-mail.</p>
  </template>

  <template v-else>
    <h1 class="text-lg font-bold mb-4" v-text="stepper.current.value.title" />

    <template v-if="uploadError">
      <span>{{ uploadError }}</span>
    </template>

    <form @submit.prevent="submitOrNext">
      <template v-if="stepper.isCurrent('file')">
        <Dropzone
          @drop="onSoundDrop"
          :accept="soundAccept"
          :multiple="true"
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
          </div>
        </Dropzone>
      </template>

      <!-- Photos Stage -->
      <template v-if="stepper.isCurrent('photos')">
        <ul>
          <li v-for="(photo, index) in uploadStore.photos" :key="index" class="flex flex-row gap-x-2">
            <img :src="makeURL(photo)" class="h-[200px]" />
            <button @click="uploadStore.photos?.splice(index, 1)" class="secondary">Odebrat</button>
          </li>
        </ul>

        <Dropzone :accept="photoAccept" @drop="onPhotoDrop">
          <template #dragging>
            <p>Upusťte soubory sem pro nahrání</p>
          </template>

          <p>
            Klikněte nebo přetáhněte fotky z místa dění
          </p>
        </Dropzone>
      </template>

      <!-- Location Stage -->
      <template v-if="stepper.isCurrent('location')">
        <ul>
          <li v-for="(part, index) in uploadStore.parts" :key="index">
            <audio :src="partURLs[index]" controls />
            <p>
              <TextualCoords
                v-if="part.location"
                :lat="part.location.lat"
                :lng="part.location.lng"
                type="municipality_part"
              />
            </p>
          </li>
        </ul>
      </template>

      <!-- Info Stage -->
      <template v-if="stepper.isCurrent('info')">
        <div class="flex flex-col w-full">
          <div class="flex flex-col gap-x-2 gap-y-4 w-full">
            <VueDatePicker
              :flow="['calendar', 'time']"
              v-model="uploadStore.dateTime"
              auto-apply
              partial-flow
              model-type="iso"
            />
            <div class="w-full">
              <label for="title" class="block text-sm font-medium w-full">Titulek</label>
              <input
                v-model="uploadStore.title"
                type="text"
                id="title"
                class="w-full"
              />
            </div>
            <div>
              <label for="note" class="block text-sm font-medium">Poznámka</label>
              <textarea
                v-model="uploadStore.note"
                id="note"
                class="w-full"
              />
            </div>
            <div>
              <label for="device" class="block text-sm font-medium">Nahrávací zařízení</label>
              <input
                v-model="uploadStore.device"
                id="device"
                type="text"
                class="w-full"
              />
            </div>
            <div>
              <label for="birdCount" class="block text-sm font-medium">Počet strnadů ({{ uploadStore.birdCount }})</label>
              <input
                v-model="uploadStore.birdCount"
                min="1"
                max="2"
                type="range"
                id="birdCount"
              />
            </div>
          </div>
          <div>
            <select
              class="filter-select drop-shadow-lg rounded-2xl m-2 hover:bg-gray-100 bg-white"
              v-model="dialect"
            >
              <option value="none" selected disabled hidden>Vyberte dialekt</option>
              <option value="BC">BC</option>
              <option value="BE">BE</option>
              <option value="BlBh">BlBh</option>
              <option value="BhBl">BhBl</option>
              <option value="XB">XB</option>
            </select>
            <button @click="addDialect" class="button-secondary">Přidat dialekt</button>
            <ul class="flex flex-col gap-y-2">
              <li v-for="(addedDialect, index) in uploadStore.dialects" :key="index" class="flex flex-row gap-x-2">
                <p>{{ addedDialect }}</p>
              </li>
            </ul>
          </div>
          <p class="flex flex-col text-gray-500 max-w-96">
            <span>Před tím, než nahrávku odešlete, zkontrolujte, zda je vše v pořádku. Pokud je vše v pořádku, klikněte na tlačítko "Nahrát". Pokud chcete nahrávku upravit, klikněte na šipku Zpět v horní části tohoto okna a vraťte se k předchozímu kroku.</span>
          </p>
        </div>
      </template>

      <template v-if="stepper.isCurrent('info')">
        <h2>Informace o nahrávce</h2>
        <p>Název nahrávky: {{ uploadStore.title }}</p>
        <p>Popis nahrávky: {{ uploadStore.note }}</p>
        <p>Počet strnadů: {{ uploadStore.birdCount }}</p>
        <p>GPS souřadnice: {{ uploadStore.location?.lat }}, {{ uploadStore.location?.lng }}</p>
        <p>Datum a čas nahrávky: {{ uploadStore.dateTime }}</p>

        <h2>Části nahrávky</h2>
        <ul class="flex flex-col gap-y-2">
          <li v-for="(_, index) in uploadStore.parts" :key="index" class="flex flex-row gap-x-2">
            <audio :src="partURLs[index]" controls class="w-1/2"></audio>
            <button @click="uploadStore.removePartByIndex(index)" class="button-secondary">Odebrat</button>
            <button @click="" class="button-secondary">Přidat dialekt</button>
          </li>
        </ul>

        <div class="flex flex-row">
          <input type="checkbox" />
          <p class="text-gray-500">
            Nahrávku chci odeslat do databáze. Jsem si vědom(a), že v ní zůstane <br />
            i po smazání mého účtu a že smazána bude jen ve vyjimečných případech.
          </p>
        </div>
      </template>

      <template v-if="stepper.isCurrent('final-confirm')">
        <p>Zkontrolujte prosím zadané údaje před odesláním.</p>
      </template>

      <template v-if="stepper.isCurrent('submit')">
        <p>Zkontrolujte prosím zadané údaje před odesláním.</p>
      </template>

      <!-- Navigation Buttons -->
      <div class="flex justify-between mt-4">
        <button
          type="button"
          @click="stepper.goToPrevious()"
          :disabled="stepper.isFirst.value"
          class="secondary p-2"
        >
          Zpět
        </button>
        <button
          type="submit"
          :disabled="!stepper.current.value.isValid()"
          class="primary p-2"
        >
          {{ stepper.isLast.value ? 'Odeslat' : 'Další' }}
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
            'text-green-600': stepper.isAfter(id) && step.isValid(), // Mark completed steps
            'text-red-600': stepper.isAfter(id) && !step.isValid(), // Mark invalid past steps (optional)
          }"
          @click="stepper.goTo(id)"
          v-text="step.title"
        />
      </div>
    </div>

    <!-- Progress Bar -->
    <SegmentedProgress :progress="stepper.currentIndex.value" :total-segments="totalSteps" class="mt-4" />
  </template>
</template>
