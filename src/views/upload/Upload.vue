<script setup lang="ts">
import { ref, watch } from 'vue'
import { defineAsyncComponent } from 'vue'
import { accountStore } from "@/state/AccountStore";
import { registerStore } from '@/state/RegisterStore';
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

const Component = ref(defineAsyncComponent({
  loader: () => import(`./stages/${STAGE_MAPPING[registerStore.stage]}.vue`)
}));

watch(() => registerStore.stage, (newStage) => {
  Component.value = defineAsyncComponent({
    loader: () => import(`./stages/${STAGE_MAPPING[newStage]}.vue`)
  });
});

const stages = Object.keys(STAGE_MAPPING).length;

</script>

<template>
  <div class="flex flex-col items-center gap-y-4">
    <div v-if="accountStore.user">
      <Component />
      <SegmentedProgress :progress="registerStore.stage" :total-segments="stages" />
    </div>
    <p v-else>Je potřeba se nejdříve přihlásit.</p>
  </div>
</template>
