<script setup vapor lang="ts">
import GoogleButton from '@/components/GoogleButton.vue';
import AppleButton from '@/components/AppleButton.vue';

defineOptions({
  inheritAttrs: false
});
</script>

<template>
  <GoogleButton v-bind="$attrs" />
  <AppleButton v-bind="$attrs" />
</template>
