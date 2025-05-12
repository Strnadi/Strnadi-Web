<script setup lang="ts">
import GoogleButton from "@/components/GoogleButton.vue";
import AppleButton from "@/components/AppleButton.vue";
</script>

<template>
  <GoogleButton v-bind="$attrs" />
  <AppleButton v-bind="$attrs" />
</template>
