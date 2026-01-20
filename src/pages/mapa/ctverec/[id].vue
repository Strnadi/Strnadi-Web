<route lang="yaml">
meta:
  layout: desktop/side
</route>

<script setup vapor lang="ts">
import TranslatedText from '@/components/TranslatedText.vue';
import { useRouteParams } from '@vueuse/router';

const id = useRouteParams<string>('id');
</script>

<template>
  <h1>
    <TranslatedText identifier="pages.map.square.title" /> {{ id }}
  </h1>
</template>
