<route lang="yaml">
meta:
  layout: desktop/side
</route>

<script setup lang="ts">
import { authorizationConfig } from '@/api/auth';
import TranslatedText from '@/components/TranslatedText.vue';

const administrationUsersUrl = `${authorizationConfig.baseUrl}/dashboard/users`;
</script>

<template>
  <section class="flex w-full flex-col gap-4">
    <h1><TranslatedText identifier="admin.users.title" /></h1>
    <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <p class="mb-4 text-gray-700">
        Správa uživatelů je nyní součástí centrální Administrace.
      </p>
      <a
        :href="administrationUsersUrl"
        class="button-primary inline-flex px-5 py-3"
      >
        Otevřít správu uživatelů
      </a>
    </div>
  </section>
</template>
