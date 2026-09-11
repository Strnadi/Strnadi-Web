<route lang="yaml">
meta:
  layout: desktop/small-popup
  mobilePresentation: workspace
  landing-bypass: true
</route>

<script setup lang="ts">
import AuthorizationRedirect from '@/views/AuthorizationRedirect.vue';
</script>

<template>
  <AuthorizationRedirect
    callback-path="/ucet/registrace"
    registration
  />
</template>
