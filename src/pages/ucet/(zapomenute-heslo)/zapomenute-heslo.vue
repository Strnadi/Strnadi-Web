<route>
meta:
  layout: desktop/small-popup
</route>

<script setup lang="ts">
import { getPasswordResetRequest } from "@/api/account";
import { useMutation } from "@tanstack/vue-query";
import { ref, computed } from "vue";
import { translations } from '@/constants/Translations';
import { applicationStore } from '@/state/ApplicationStore';
import TranslatedText from '@/components/TranslatedText.vue';

const email = ref("");
const currentTranslations = computed(() => translations[applicationStore.language]);

const { mutate } = useMutation({
  mutationFn: ({ email }: { email: string }) => getPasswordResetRequest(email)
})

const submit = () => { mutate({ email: email.value }); }
</script>

<template>
  <div class="flex flex-col items-center gap-y-6 w-full">
    <img src="/logo-no-text.svg">
    <h1 class="text-center">
      <TranslatedText identifier="password_reset.title" />
    </h1>

    <div class="flex flex-col items-center gap-y-6 w-full">
      <div class="w-full flex flex-col gap-y-1">
        <label
          for="email"
          class="block text-sm font-medium"
        >
          <TranslatedText identifier="labels.email" />
        </label>
        <input
          id="email"
          v-model="email"
          type="email"
          :placeholder="currentTranslations.placeholders.email"
        >
      </div>
      <button
        class="secondary p-2 w-full"
        @click="submit"
      >
        <TranslatedText identifier="buttons.send_code" />
      </button>
    </div>
  </div>
</template>
