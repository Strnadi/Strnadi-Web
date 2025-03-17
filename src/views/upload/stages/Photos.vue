<template>
  <div class="flex flex-col gap-y-2">
    <h1>Přidat fotky</h1>
    <p v-if="error" class="text-red-500">{{ error }}</p>
    <Dropzone accept="image/*" @drop="onDrop">
      <template #dragging>
        <div class="text-4xl mb-2 text-gray-500">↑</div>
        <p>Uvolněte soubory pro nahrání</p>
      </template>

      <p>
        Klikněte nebo přetáhněte fotky
      </p>
    </Dropzone>
    <button class="secondary p-2 w-full" @click="onDrop([])">Pokračovat bez fotek</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { uploadStore } from "@/state/UploadStore";
import Dropzone from "@/components/generic/Dropzone.vue";

// Local state
const error = ref<string | null>(null);

const onDrop = (acceptedFiles: File[]) => {
  uploadStore.setPhotos(acceptedFiles);
  uploadStore.nextStage();
  error.value = null;
};

</script>

<style scoped>
/* Add any custom styles if needed */
</style>
