<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  progress: { type: Number, default: 1.0 },
  totalSegments: { type: Number, default: 4 }
});

const segments = computed(() =>
  Array.from({ length: props.totalSegments }, (_, i) => i)
);

const calculateFillAmount = (segmentIndex: number) => {
  if (props.progress <= segmentIndex) {
    return 0;
  } else if (props.progress >= segmentIndex + 1) {
    return 1;
  }

  return props.progress - segmentIndex;
};
</script>

<template>
  <div class="segmented-progress-bar">
    <div
      v-for="segmentIndex in segments"
      :key="segmentIndex"
      class="segment"
    >
      <div
        class="segment-fill"
        :style="{ width: `${calculateFillAmount(segmentIndex) * 100}%` }"
      />
    </div>
  </div>
</template>

<style scoped>
@reference "../styles/main.css";

.segmented-progress-bar {
  @apply flex flex-row justify-between items-stretch w-full md:h-3 h-6 box-border mt-1 mb-1 overflow-hidden;
}

.segment {
  @apply flex-1 relative m-2 bg-gray-300 rounded-md;
}

/* The fill portion of the segment */
.segment-fill {
  @apply h-full bg-yellow-300 transition-all duration-300 rounded-md;
}
</style>
