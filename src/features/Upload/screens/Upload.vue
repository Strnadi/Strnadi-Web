<script setup lang="ts">
import { onUnmounted, shallowRef, watch } from 'vue'
import { defineAsyncComponent } from 'vue'
import { accountStore } from "@/features/Account/state/AccountStore";
import { uploadStore } from '@/features/Upload/state/UploadStore';
import SegmentedProgress from '@/features/SegmentedProgress/components/SegmentedProgress.vue';

const STAGE_MAPPING = [
  "File",
  "Photos",
  "Location",
  "Info",
  "Submit"
];

onUnmounted(() => {
  uploadStore.reset();
});

const loadComponent = (stage: number) => defineAsyncComponent({
  loader: () => import(`./stages/${STAGE_MAPPING[stage]}.vue`)
});

const Component = shallowRef(loadComponent(uploadStore.stage));

watch(() => uploadStore.stage, (newStage) => {
  Component.value = loadComponent(newStage);
});

const stages = Object.keys(STAGE_MAPPING).length - 1;

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
    <Component :key="uploadStore.stage" />
    <SegmentedProgress :progress="uploadStore.stage" :total-segments="stages" />
  </template>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  height: 0;
  padding: 0;
  margin: 0;
}
</style>