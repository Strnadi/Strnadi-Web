<script setup vapor lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { uploadQueueStore } from '@/state/UploadStore';
import UploadIcon from '@/icons/interface/icon-upload.svg';
import TranslatedText from '@/components/TranslatedText.vue';
import Dropdown from '@/components/Dropdown.vue';

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
    class="upload-progress-dropdown-wrapper"
  >
    <Dropdown>
      <template #title>
        <div class="upload-pill">
          <div class="pill-icon-wrapper">
            <UploadIcon class="pill-icon" />
            <div class="pill-badge" v-if="queuedCount + uploadingCount > 1">
              {{ queuedCount + uploadingCount }}
            </div>
          </div>

          <div class="pill-content">
            <div class="pill-label">
              <TranslatedText
                :identifier="
                  uploadingCount > 0
                    ? 'upload.progress.uploading'
                    : 'upload.progress.queued'
                "
              />
            </div>
            <div class="pill-progress-container">
              <div class="pill-progress-bar">
                <div
                  class="pill-progress-fill"
                  :style="{ width: `${overallProgress}%` }"
                />
              </div>
              <span class="pill-percentage"
                >{{ Math.round(overallProgress) }}%</span
              >
            </div>
          </div>
        </div>
      </template>

      <li
        v-for="task in uploadQueueStore.tasks"
        :key="task.id"
        class="task-entry"
      >
        <div class="task-header">
          <span
            class="task-title"
            :title="task.recording.name"
          >
            {{ task.recording.name || 'Nahrávka' }}
          </span>
          <span
            class="task-status-text"
            :class="task.status"
          >
            <template v-if="task.status === 'error'">
              <TranslatedText identifier="upload.progress.error" />
            </template>
            <template v-else-if="task.status === 'completed'"> ✓ </template>
            <template v-else> {{ task.progress }}% </template>
          </span>
        </div>

        <div class="task-progress-bg">
          <div
            class="task-progress-bar"
            :class="task.status"
            :style="{ width: task.progress + '%' }"
          />
        </div>

        <div
          v-if="task.status === 'error'"
          class="task-error-footer"
        >
          <p class="error-detail">{{ task.error }}</p>
          <button
            class="dismiss-task"
            @click.stop="dismissError(task.id)"
          >
            <TranslatedText identifier="buttons.remove" />
          </button>
        </div>
      </li>
    </Dropdown>
  </div>
</template>

<style scoped>
@reference "../styles/main.css";

.upload-progress-dropdown-wrapper {
  @apply flex items-center;
}

/* Base Pill Styles (Dropdown Trigger) */
.upload-pill {
  @apply flex flex-row items-center gap-3 bg-white border border-gray-100 px-3 py-1.5 rounded-2xl shadow-sm;
  @apply transition-all duration-300;
}

.pill-icon-wrapper {
  @apply relative flex items-center justify-center shrink-0;
}

.pill-icon {
  @apply w-5 h-5 text-gray-700;
}

.pill-badge {
  @apply absolute -top-1 -right-1 flex items-center justify-center min-w-[14px] h-[14px] px-1;
  @apply bg-yellow-400 text-[9px] font-bold text-gray-900 rounded-full border border-white leading-none;
}

.pill-content {
  @apply flex flex-col gap-0.5 min-w-0 text-left;
}

.pill-label {
  @apply text-[10px] font-bold uppercase tracking-wider text-gray-400 leading-none;
}

.pill-progress-container {
  @apply flex flex-row items-center gap-2;
}

.pill-progress-bar {
  @apply w-12 sm:w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden shrink-0;
}

.pill-progress-fill {
  @apply h-full transition-all duration-500 ease-out rounded-full;
  background-color: #ffd400;
}

.pill-percentage {
  @apply text-[11px] font-bold text-gray-700 tabular-nums leading-none;
}

/* Dropdown Content Styles */
.task-entry {
  @apply flex flex-col gap-2 p-3 min-w-[240px] border-b border-gray-50 last:border-0;
}

.task-header {
  @apply flex justify-between items-center gap-4;
}

.task-title {
  @apply text-xs font-bold text-gray-700 truncate max-w-[160px];
}

.task-status-text {
  @apply text-[10px] font-black uppercase;
}

.task-status-text.uploading {
  @apply text-yellow-600;
}
.task-status-text.queued {
  @apply text-gray-400;
}
.task-status-text.completed {
  @apply text-green-500;
}
.task-status-text.error {
  @apply text-red-500;
}

.task-progress-bg {
  @apply w-full h-1 bg-gray-100 rounded-full overflow-hidden;
}

.task-progress-bar {
  @apply h-full transition-all duration-500;
}

.task-progress-bar.uploading {
  background-color: #ffd400;
}
.task-progress-bar.queued {
  @apply bg-gray-300;
}
.task-progress-bar.completed {
  @apply bg-green-500;
}
.task-progress-bar.error {
  @apply bg-red-500;
}

.task-error-footer {
  @apply flex flex-col gap-1 mt-1;
}

.error-detail {
  @apply text-[10px] text-red-400 italic leading-tight;
}

.dismiss-task {
  @apply self-end text-[10px] font-bold text-red-500 hover:text-red-700 transition-colors uppercase cursor-pointer;
}

/* Hover effects */
.upload-pill:hover {
  @apply border-yellow-200 shadow-md;
}
</style>
