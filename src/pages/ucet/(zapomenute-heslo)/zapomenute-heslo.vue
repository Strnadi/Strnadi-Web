<route lang="yaml">
meta:
  layout: desktop/small-popup
</route>

<script setup lang="ts">
import { getPasswordResetRequest } from '@/api/account';
import { useMutation } from '@tanstack/vue-query';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import TranslatedText, { t } from '@/components/TranslatedText.vue';

const email = ref('');
const router = useRouter();

const { mutate, isSuccess } = useMutation({
  mutationFn: ({ email }: { email: string }) => getPasswordResetRequest(email)
});

const submit = () => {
  mutate({ email: email.value });
};
</script>

<template>
  <div class="flex flex-col items-center gap-y-6 w-full">
    <img src="/logo-no-text.svg" />
    <h1 class="text-center">
      <TranslatedText identifier="auth.reset_password.title" />
    </h1>

    <div
      v-if="!isSuccess"
      class="flex flex-col items-center gap-y-6 w-full"
    >
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
          class="p-2"
          :placeholder="t('placeholders.email')"
        />
      </div>
      <button
        class="secondary p-2 w-full"
        @click="submit"
      >
        <TranslatedText identifier="buttons.send_code" />
      </button>
    </div>

    <div
      v-else
      class="flex flex-col items-center gap-y-6 w-full"
    >
      <span>
        <TranslatedText identifier="auth.reset_password.success" />
      </span>

      <button
        class="secondary w-full h-10"
        @click="router.push('/')"
      >
        <TranslatedText identifier="buttons.close" />
      </button>
    </div>
  </div>
</template>
