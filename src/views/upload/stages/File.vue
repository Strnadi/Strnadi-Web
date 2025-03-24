<template>
  <h1>Nahrát nahrávku</h1>
  <p v-if="error" class="text-red-500">{{ error }}</p>
  <Dropzone @drop="onDrop" :accept="accept" :multiple="true">
    <template #dragging>
      <div class="text-4xl mb-2 text-gray-500">↑</div>
      <p>Uvolněte soubory pro nahrání</p>
    </template>

    <div class="flex flex-col items-center">
      <p>Klikněte nebo přetáhněte zvuk</p>
      <p>(.wav, .mp3, .flac, .aac, .ogg)</p>
    </div>
  </Dropzone>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { uploadStore } from "@/state/UploadStore";
import Dropzone from "@/components/generic/Dropzone.vue";

const accept = [
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/mpeg",
  "audio/flac",
  "audio/x-flac",
  "audio/aac",
  "audio/x-aac",
  "audio/ogg",
];

// Local state
const error = ref<string | null>(null);

const onDrop = (acceptedFiles: any[]) => {
  console.log(acceptedFiles);

  if (acceptedFiles.length === 0) {
    error.value = "Žádné validní soubory nebyly vybrány.";
    return;
  }

  uploadStore.setRecordings(acceptedFiles);
  uploadStore.nextStage();
};
</script>
