<route lang="yaml">
meta:
  layout: desktop/small-popup
</route>

<script setup lang="ts">
import { patchPasswordChange } from '@/api/account';
import RevealablePasswordInput from '@/components/RevealablePasswordInput.vue';
import { useMutation } from '@tanstack/vue-query';
import { useRouteQuery } from '@vueuse/router';
import { ref } from 'vue';
import TranslatedText, { t } from '@/components/TranslatedText.vue';
import type { TranslationIdentifier } from '@/constants/Translations';

const resetPasswordSuccessKey =
  'auth.reset_password.reset_success' as TranslationIdentifier;
const resetPasswordFailureKey =
  'auth.reset_password.reset_failure' as TranslationIdentifier;

const token = useRouteQuery('token');
const userId = useRouteQuery('userId');
const password = ref('');
const passwordConfirm = ref('');

const { mutate, isPending, isIdle, isSuccess, isError, error } = useMutation({
  mutationFn: ({
    token,
    userId,
    newPassword
  }: {
    token: string;
    userId: string;
    newPassword: string;
  }) => patchPasswordChange(token, userId, newPassword)
});

const submitPasswordChange = () => {
  if (!token.value || !userId.value) {
    console.error('Token or userId is missing');
    return;
  }

  mutate({
    token: token.value as string,
    userId: userId.value as string,
    newPassword: password.value
  });
};
</script>

<template>
  <h1 class="text-center">
    <TranslatedText identifier="auth.reset_password.reset_title" />
  </h1>
  <div class="flex flex-col items-center gap-y-6 w-full">
    <template v-if="isSuccess">
      <p class="text-center">
        <TranslatedText :identifier="resetPasswordSuccessKey" />
      </p>
      <RouterLink to="/" class="button-secondary p-2 w-full">
        <TranslatedText identifier="buttons.go_home" />
      </RouterLink>
    </template>
    <template v-else>
      <template v-if="isError">
        <div class="text-center text-red-600">
          <TranslatedText identifier="common.error_prefix" />
          <span class="ml-1">{{ error!.message }}</span>
        </div>
        <p class="text-center">
          <TranslatedText :identifier="resetPasswordFailureKey" />
        </p>
      </template>

      <div class="flex flex-col items-center gap-y-6 w-full">
        <RevealablePasswordInput v-model="password">
          <TranslatedText identifier="labels.password" />
        </RevealablePasswordInput>
        <RevealablePasswordInput v-model="passwordConfirm">
          <TranslatedText identifier="labels.password_confirm" />
        </RevealablePasswordInput>
        <button
          v-if="!isPending"
          class="secondary p-2 w-full"
          :disabled="
            !(passwordConfirm && passwordConfirm === password && token && isIdle)
          "
          @click="submitPasswordChange"
        >
          <TranslatedText identifier="buttons.change_password" />
        </button>
        <button v-else class="secondary p-2 w-full" disabled>
          {{ t('loading') }}
        </button>
      </div>
    </template>
  </div>
</template>
