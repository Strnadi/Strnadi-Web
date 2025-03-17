<script setup lang="ts">
import { ref, shallowRef, watch } from 'vue'
import { defineAsyncComponent } from 'vue'
import { accountStore } from "@/state/AccountStore";
import { uploadStore } from '@/state/UploadStore';
import SegmentedProgress from '@/components/generic/SegmentedProgress.vue';

const STAGE_MAPPING: Record<number, string> = {
  0: "File",
  1: "Dialect",
  2: "Location",
  3: "Photos",
  4: "Info",
  5: "FinalConfirm",
  6: "Submit"
};

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
  <div class="flex flex-col items-center gap-y-4">
    <template v-if="accountStore.user">
      <Component />
      <SegmentedProgress :progress="uploadStore.stage" :total-segments="stages" />
    </template>
    <p v-else>Je potřeba se nejdříve přihlásit.</p>
  </div>
</template>
