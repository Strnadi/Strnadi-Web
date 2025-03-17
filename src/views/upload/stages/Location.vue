<template>
  <h1 className='text-2xl font-bold'>Přidání lokace</h1>
  <p>Zaklikněte v mapě kde jste nahrávali</p>
  <button class="primary p-2 w-full" @click="onClick">
    Pokračovat
  </button>
</template>

<script lang="ts" setup>

import { uploadStore } from '@/state/UploadStore';
import { mapStore } from '@/state/MapStore';
import { onBeforeUnmount, onMounted } from 'vue';

function onClick() {
  if (mapStore.selectedLocation) {
    uploadStore.setLocation(mapStore.selectedLocation);
    uploadStore.nextStage();
  } else {
    alert("Zaklikněte lokaci!");
  }
}

onMounted(() => {
  mapStore.setSelectEnabled(true);
});

onBeforeUnmount(() => {
  mapStore.setSelectEnabled(false);
});
</script>
