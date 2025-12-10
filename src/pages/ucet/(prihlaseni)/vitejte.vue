<route lang="yaml">
meta:
  layout: desktop/popup
</route>

<script setup lang="ts">
import HorizontalLineWithText from '@/components/HorizontalLineWithText.vue';
import TranslatedText from '@/components/TranslatedText.vue';
</script>

<template>
  <div class="flex flex-col items-center gap-y-6 w-full">
    <img src="/logo-no-text.svg" />
    <h1 class="text-center">
      <TranslatedText identifier="project_name" />
    </h1>
    <span class="text-xl text-center">
      <TranslatedText identifier="project_description_short" />
    </span>

    <div class="flex flex-col items-center gap-y-2 w-full">
      <RouterLink
        :replace="true"
        to="/ucet/prihlaseni"
        class="button-primary p-2 w-full"
      >
        <TranslatedText identifier="buttons.login" />
      </RouterLink>
      <RouterLink
        :replace="true"
        to="/ucet/registrace"
        class="button-secondary p-2 w-full"
      >
        <TranslatedText identifier="buttons.register" />
      </RouterLink>
    </div>

    <HorizontalLineWithText>
      <span class="text-sm text-gray-500">
        <TranslatedText identifier="common.or" />
      </span>
    </HorizontalLineWithText>

    <router-link
      to="/"
      class="p-2"
    >
      <TranslatedText identifier="auth.welcome.continue_without_account" />
    </router-link>
  </div>
</template>
