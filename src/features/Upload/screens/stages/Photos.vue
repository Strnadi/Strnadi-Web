<script setup lang="ts">
import { ref } from "vue";
import { uploadStore } from "@/features/Upload/state/UploadStore";
import Dropzone from "@/features/Dropzone/components/Dropzone.vue";

// Local state
const error = ref<string | null>(null);

const onDrop = (acceptedFiles: File[]) => {
  uploadStore.photos = [...(uploadStore.photos || []), ...acceptedFiles];
  error.value = null;
};

const makeURL = (file: File) => {
  const url = URL.createObjectURL(file);
  return url;
};

</script>

<template>
  <h1>Přidat fotky</h1>
  <p v-if="error" class="text-red-500">{{ error }}</p>

  <ul>
    <li v-for="(photo, index) in uploadStore.photos" :key="index" class="flex flex-row gap-x-2">
      <img :src="makeURL(photo)" class="h-[200px]" />
      <button @click="uploadStore.photos?.splice(index, 1)" class="secondary">Odebrat</button>
    </li>
  </ul>

  <Dropzone accept="image/*" @drop="onDrop">
    <template #dragging>
      <p>↑ Uvolněte soubory pro nahrání</p>
    </template>

    <p>
      Klikněte nebo přetáhněte fotky z místa dění
    </p>
  </Dropzone>

  <button v-if="(uploadStore.photos?.length ?? 0) > 0" class="primary p-2 w-full" @click="uploadStore.nextStage">Pokračovat</button>
  <button v-else class="secondary p-2 w-full" @click="uploadStore.nextStage">Pokračovat bez fotek</button>
</template>
