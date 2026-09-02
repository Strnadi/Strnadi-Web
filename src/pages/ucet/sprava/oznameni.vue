<route lang="yaml">
meta:
  layout: desktop/side
</route>

<script setup lang="ts">
import { applicationStore } from '@/state/ApplicationStore';
import Notification from '@/views/Notification.vue';

const dismiss = (index: number) => applicationStore.notifications.splice(index, 1);
</script>

<template>
  <section class="w-full space-y-4">
    <h1 class="text-2xl font-bold">Oznámení</h1>
    <ul v-if="applicationStore.notifications.length" class="space-y-3">
      <li v-for="(notification, index) in applicationStore.notifications" :key="`${index}-${notification.title}`">
        <Notification v-bind="notification" @dismiss="dismiss(index)" />
      </li>
    </ul>
    <p v-else>Nemáte žádná oznámení.</p>
  </section>
</template>
