<script setup lang="ts">
import type { Notification } from '@/types/notification';
const props = defineProps<Notification>();

const emit = defineEmits<{
  dismiss: []
}>();
</script>

<template>

  <div class="w-96 h-max flex flex-row gap-x-1 border-4 border-yellow-400 relative">
    <button class="absolute top-0 right-0 p-2" @click="emit('dismiss')">
      x
    </button>
    <img src="" alt="" />
    <div class="flex flex-col">
      <span v-if="props.title" class="font-semibold">{{ props.title }}</span>
      <span class="text-sm">{{ props.message }}</span>
    </div>
  </div>

</template>
