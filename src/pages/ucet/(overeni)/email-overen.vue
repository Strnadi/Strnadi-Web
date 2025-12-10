<route lang="yaml">
meta:
  layout: desktop/small-popup
</route>

<script setup vapor lang="ts">
import { computed } from 'vue';
import TranslatedText from '@/components/TranslatedText.vue';

const isMobile = computed(() => {
  const userAgent =
    navigator.userAgent || navigator.vendor || (window as any).opera;
  return /android|iPad|iPhone/i.test(userAgent);
});
</script>

<template>
  <div class="flex flex-col items-center gap-y-6 w-full">
    <div class="flex flex-col items-center gap-y-3">
      <img src="/logo-no-text.svg" />
      <h2>
        <TranslatedText identifier="project_name" />
      </h2>
    </div>
    <span class="text-xl text-center">
      <TranslatedText identifier="verification.email.success_message" />
    </span>
    <a
      v-if="isMobile"
      class="button-primary p-2 w-full text-center"
      href="com.delta.strnadi://"
    >
      <TranslatedText identifier="buttons.back_to_app" />
    </a>
    <RouterLink
      v-else
      class="button-primary p-2 w-full text-center"
      :replace="true"
      to="/"
    >
      <TranslatedText identifier="buttons.complete_registration" />
    </RouterLink>
  </div>
</template>
