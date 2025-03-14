<template>
  <h1 className='text-2xl font-bold'>Přidání lokace</h1>
  <p>Zaklikněte v mapě kde jste nahrávali</p>
  <button @click="onClick">
    Pokračovat
  </button>
</template>

<script lang="ts" setup>

import { uploadStore } from '@/state/UploadStore';
import { mapStore } from '@/state/MapStore';

function onClick() {
  if (mapStore.selectedLocation) {
    uploadStore.setLocation(mapStore.selectedLocation);
    uploadStore.nextStage();
  } else {
    alert("Zaklikněte lokaci!");
  }
}
</script>
