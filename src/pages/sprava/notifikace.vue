<route lang="yaml">
meta:
  layout: desktop/side
</route>

<script setup lang="ts">
import TranslatedText from '@/components/TranslatedText.vue';
</script>

<template>
  <h1>
    <TranslatedText identifier="admin.notifications.title" />
  </h1>

  <div class="flex flex-col gap-y-2">
    <h2>
      Historie notifikací
    </h2>
    <div class="flex flex-col gap-y-2">
    </div>
  </div>
</template>
