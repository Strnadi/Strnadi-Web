<script setup lang="ts">
import { ref, watch } from 'vue'
import { defineAsyncComponent } from 'vue'
import { registerStore } from '@/state/RegisterStore';
import SegmentedProgress from '@/components/generic/SegmentedProgress.vue';

const STAGE_MAPPING: Record<number, string> = {
  0: "Email",
  1: "Agreement",
  2: "PersonalInfo",
  3: "Location",
  4: "Password",
  5: "FinalConfirm"
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
    <Component />
    <SegmentedProgress :progress="registerStore.stage" :total-segments="stages" />
  </div>
</template>
