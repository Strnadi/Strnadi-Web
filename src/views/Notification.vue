<script setup vapor lang="ts">
import type { Notification } from '@/types/notifications';
const props = defineProps<Notification>();

const emit = defineEmits<{
  dismiss: [];
}>();
</script>

<template>
  <div
    class="w-96 h-max flex flex-row gap-x-1 relative"
    role="status"
    aria-live="polite"
  >
    <button
      class="absolute top-0 right-0 p-2"
      type="button"
      aria-label="Zavřít oznámení"
      @click="emit('dismiss')"
    >
      x
    </button>
    <div class="flex flex-col">
      <h1
        v-if="props.title"
        class="text-lg font-semibold"
      >
        {{ props.title }}
      </h1>
      <span>{{ props.message }}</span>
    </div>
  </div>
</template>
