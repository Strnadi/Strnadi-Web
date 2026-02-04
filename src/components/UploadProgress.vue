<script setup vapor lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { uploadQueueStore } from '@/state/UploadStore';

const activeTasks = computed(() => uploadQueueStore.getActiveTasks());
const hasActiveTasks = computed(() => activeTasks.value.length > 0);
const overallProgress = computed(() => uploadQueueStore.getTotalProgress());

const queuedCount = computed(
  () => activeTasks.value.filter((t) => t.status === 'queued').length
);
const uploadingCount = computed(
  () => activeTasks.value.filter((t) => t.status === 'uploading').length
);

const errorTasks = computed(() =>
  uploadQueueStore.tasks.filter((t) => t.status === 'error')
);

const dismissError = (taskId: string) => {
  uploadQueueStore.removeTask(taskId);
};

// Prevent page unload during uploads
const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (hasActiveTasks.value) {
    event.preventDefault();
    event.returnValue =
      'Nahrávání stále probíhá. Opravdu chcete opustit stránku?';
    return event.returnValue;
  }
};

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload);
});

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
});
</script>

<template>
  <div
    v-if="hasActiveTasks || errorTasks.length > 0"
    class="upload-progress-container"
  >
    <!-- Active Upload Indicator (Compact) -->
    <div
      v-if="hasActiveTasks"
      class="upload-progress"
    >
      <span class="upload-icon">📤</span>
      <div class="upload-content">
        <div class="upload-text">
          {{ uploadingCount > 0 ? 'Nahrávání' : 'V pořadí' }}
          <template v-if="queuedCount > 0">
            ({{ queuedCount + uploadingCount }})
          </template>
        </div>
        <div class="progress-bar-wrapper">
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: `${overallProgress}%` }"
            />
          </div>
          <div class="progress-percentage">
            {{ Math.round(overallProgress) }}%
          </div>
        </div>
      </div>
    </div>

    <!-- Error Messages (Compact) -->
    <div
      v-for="errorTask in errorTasks"
      :key="errorTask.id"
      class="upload-error"
    >
      <span class="error-icon">⚠️</span>
      <div class="error-text">Chyba při nahrávání</div>
      <button
        class="dismiss-button"
        title="Zavřít"
        @click="dismissError(errorTask.id)"
      >
        ✕
      </button>
    </div>
  </div>
</template>

<style scoped>
@reference "../styles/main.css";

.upload-progress-container {
  @apply flex flex-row items-center gap-2;
}

.upload-progress {
  @apply flex flex-row items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200;
}

.upload-icon {
  @apply text-base shrink-0;
}

.upload-content {
  @apply flex flex-col gap-0.5 min-w-0;
}

.upload-text {
  @apply text-xs font-semibold text-blue-900 whitespace-nowrap;
}

.progress-bar-wrapper {
  @apply flex flex-row items-center gap-2;
}

.progress-bar {
  @apply w-24 h-1.5 bg-blue-100 rounded-full overflow-hidden;
}

.progress-fill {
  @apply h-full bg-blue-500 transition-all duration-300 ease-out rounded-full;
}

.progress-percentage {
  @apply text-xs font-medium text-blue-700 tabular-nums;
}

.upload-error {
  @apply flex flex-row items-center gap-2 bg-red-50 px-3 py-1.5 rounded-full border border-red-200;
}

.error-icon {
  @apply text-base shrink-0;
}

.error-text {
  @apply text-xs font-semibold text-red-900 whitespace-nowrap;
}

.dismiss-button {
  @apply text-red-400 hover:text-red-600 font-bold text-sm px-1 transition-colors cursor-pointer shrink-0;
}
</style>
