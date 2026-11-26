<route lang="yaml">
meta:
  layout: desktop/small-popup
  landing-bypass: true
</route>

<script setup vapor lang="ts">
import AuthorizationRedirect from '@/views/AuthorizationRedirect.vue';
</script>

<template>
  <AuthorizationRedirect callback-path="/ucet/prihlaseni" />
</template>
