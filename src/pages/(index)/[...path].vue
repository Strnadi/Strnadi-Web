<route lang="yaml">
meta:
  layout: desktop/small-popup
</route>

<script setup vapor lang="ts">
import TranslatedText from '@/components/TranslatedText.vue';
</script>

<template>
  <h1>
    <TranslatedText identifier="not_found" />
  </h1>
  <span>
    <TranslatedText identifier="pages.not_found.description" />
  </span>
</template>
