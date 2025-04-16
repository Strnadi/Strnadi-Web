<template>
  <h1>Přidání lokace</h1>
  <p>Zaklikněte v mapě, kde jste nahrávali jednotlivé části</p>
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
  <button
    @click="uploadStore.nextStage"
    :disabled="!uploadStore.parts?.every((part) => part.location != null)"
    class="primary p-2 w-full"
  >
    Pokračovat
  </button>
</template>

<script lang="ts" setup>
import { uploadStore } from "@/state/UploadStore";
import { mapStore, type LatLng } from "@/state/MapStore";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import TextualCoords from "@/components/map/TextualCoords.vue";

const currentPartIndex = ref(0);

const partURLs = computed(() => {
  return uploadStore.parts!.map((part) => URL.createObjectURL(part.recording));
});

watch(() => mapStore.selectedLocation, (newLocation: LatLng | null) => {
  if (newLocation) {
    uploadStore.parts![currentPartIndex.value].location = newLocation;
    currentPartIndex.value++;
  }
});

onMounted(() => {
  mapStore.setSelectEnabled(true);
});

onBeforeUnmount(() => {
  mapStore.setSelectEnabled(false);
});
</script>
