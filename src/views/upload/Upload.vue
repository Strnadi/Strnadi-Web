<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import { defineAsyncComponent } from 'vue'
import { accountStore } from "@/state/AccountStore";
import { uploadStore } from '@/state/UploadStore';
import SegmentedProgress from '@/components/generic/SegmentedProgress.vue';

const STAGE_MAPPING = [
  "File",
  "Location",
  "Info",
  "Photos",
  "Dialect",
  "FinalConfirm",
  "Submit"
];

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
  <template v-if="accountStore.user">
    <Component />
    <SegmentedProgress :progress="uploadStore.stage" :total-segments="stages" />
  </template>
  <p v-else>Je potřeba se nejdříve přihlásit.</p>
</template>
