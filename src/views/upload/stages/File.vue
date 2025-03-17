<template>
  <h1>Nahrát nahrávku</h1>
  <p v-if="error" class="text-red-500">{{ error }}</p>
  <Dropzone @drop="onDrop" :multiple="true">
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
import type { FileRejectReason } from "vue3-dropzone";

// Local state
const error = ref<string | null>(null);
const acceptTypes = [
  'audio/ogg'
]

const onDrop = (acceptedFiles: any[], rejectReasons: FileRejectReason[]) => {
  if (acceptedFiles.length === 0) {
    error.value = "Žádné validní soubory nebyly vybrány.";
    console.log("Rejected files:", rejectReasons);
    return;
  }

  uploadStore.setRecordings(acceptedFiles);
  uploadStore.nextStage();
  error.value = null;
};

</script>

<style scoped>
/* Add any custom styles if needed */
</style>
