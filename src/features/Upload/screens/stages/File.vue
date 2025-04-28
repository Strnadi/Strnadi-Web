<template>
  <h1>Nahrát nahrávku</h1>
  <p v-if="error" class="text-red-500">{{ error }}</p>
  <Dropzone @drop="onDrop" :accept="accept" :multiple="true">
    <template #dragging>
      <p>↑ Upusťte soubory sem pro nahrání</p>
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

<script setup lang="ts">
import { ref } from "vue";
import { uploadStore } from "@/features/Upload/state/UploadStore";
import Dropzone from "@/features/Dropzone/components/Dropzone.vue";

const accept = [
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/x-pn-wav",
  "audio/vnd.wave",
  "audio/wave",
  "audio/mpeg",
  "audio/flac",
  "audio/x-flac",
  "audio/aac",
  "audio/x-aac",
  "audio/ogg",
  "audio/vorbis",
  "application/ogg",
  "application/vorbis",
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
