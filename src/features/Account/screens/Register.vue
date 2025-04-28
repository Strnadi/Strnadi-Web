<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import { defineAsyncComponent } from 'vue'
import { registerStore } from '@/features/Account/state/RegisterStore';
import SegmentedProgress from '@/features/SegmentedProgress/components/SegmentedProgress.vue';

const STAGE_MAPPING: Record<number, string> = {
  0: "Email",
  1: "PersonalInfo",
  2: "Location",
  3: "Password",
  4: "FinalConfirm",
  5: "Done"
};

const loadComponent = (stage: number) => defineAsyncComponent({
  loader: () => import(`./register-stages/${STAGE_MAPPING[stage]}.vue`)
});

const Component = shallowRef(loadComponent(registerStore.stage));

watch(() => registerStore.stage, (newStage) => {
  Component.value = loadComponent(newStage);
});

const stages = Object.keys(STAGE_MAPPING).length;

</script>

<template>
  <Component />
  <SegmentedProgress v-if="registerStore.stage != 0" :progress="registerStore.stage" :total-segments="stages" />
</template>
