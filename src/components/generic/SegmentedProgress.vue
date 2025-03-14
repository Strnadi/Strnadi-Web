<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  progress: { type: Number, default: 1.0 },
  totalSegments: { type: Number, default: 4 }
})

const segments = computed(() =>
  Array.from({ length: props.totalSegments }, (_, i) => i)
)

const calculateFillAmount = (segmentIndex: number) => {
  if (props.progress <= segmentIndex) {
    return 0
  } else if (props.progress >= segmentIndex + 1) {
    return 1
  }
  return props.progress - segmentIndex
}
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
.segmented-progress-bar {
  display: flex;
  width: 200px;       /* Adjust as needed */
  height: 20px;       /* Adjust as needed */
  border: 1px solid #000;
  box-sizing: border-box;
  overflow: hidden;   /* In case of partial fill, ensures neat edges */
}

.segment {
  flex: 1;
  position: relative;
  background-color: #fff; /* Base color of each segment */
  border-right: 1px solid #000;
}

/* Remove the right border for the last segment */
.segment:last-child {
  border-right: none;
}

/* The fill portion of the segment */
.segment-fill {
  height: 100%;
  background-color: #ffc107; /* The "filled" color (yellow) */
  transition: width 0.3s ease; /* Optional smooth transition */
}
</style>
