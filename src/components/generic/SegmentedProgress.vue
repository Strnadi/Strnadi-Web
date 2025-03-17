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
  height: 10px;       /* Adjust as needed */
  box-sizing: border-box;
  overflow: hidden;   /* In case of partial fill, ensures neat edges */
}

.segment {
  flex: 1;
  position: relative;
  margin: 2px;
  background-color: #d5d5d5; /* Base color of each segment */
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
