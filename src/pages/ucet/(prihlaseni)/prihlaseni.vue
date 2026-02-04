<route lang="yaml">
meta:
  layout: desktop/small-popup
</route>

<script setup lang="ts">
import * as jose from 'jose';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMutation } from '@tanstack/vue-query';
import { postAppleLogin, postGoogleLogin, postLogin } from '@/api/account';
import { accountStore } from '@/state/AccountStore';
import { registerStore } from '@/pages/ucet/(prihlaseni)/registrace.vue';

import AuthButtons from '@/views/AuthButtons.vue';
import RevealablePasswordInput from '@/components/RevealablePasswordInput.vue';
import TranslatedText, { t } from '@/components/TranslatedText.vue';

const router = useRouter();

const email = ref('');
const password = ref('');
const oauth2_error = ref('');

const {
  mutate: googleLoginMutate,
  isPending: googleLoginPending,
  error: googleLoginMutationError
} = useMutation({
  mutationFn: (loginInfo: { idToken: string }) => postGoogleLogin(loginInfo),

  onSuccess: (data) => {
    router.replace('/');
    accountStore.login(data);
  }
});

const {
  mutate: appleLoginMutate,
  isPending: appleLoginPending,
  error: appleLoginMutationError
} = useMutation({
  mutationFn: (loginInfo: {
    idToken: string;
    givenName?: string;
    familyName?: string;
  }) => postAppleLogin(loginInfo),

  onSuccess: async (data) => {
    console.log('data', data);

    if (data.exists === false) {
      registerStore.name = data.firstName;
      registerStore.surname = data.lastName;
      registerStore.email = data.email;
      registerStore.appleId = data.appleid;
      registerStore.isExternalSignup = true;
      registerStore.jwt = data.jwt;
      await router.push('/ucet/registrace');
    } else {
      await accountStore.login(data.jwt);
      await router.replace('/');
    }
  }
});

const {
  mutate: loginMutate,
  isPending: loginPending,
  error: loginError
} = useMutation({
  mutationFn: (loginInfo: { email: string; password: string }) =>
    postLogin(loginInfo),

  onSuccess: (data) => {
    router.back();
    accountStore.login(data);
  }
});

const isPending = computed(
  () =>
    loginPending.value || googleLoginPending.value || appleLoginPending.value
);
const error = computed(
  () =>
    loginError.value ||
    googleLoginMutationError.value ||
    oauth2_error.value ||
    appleLoginMutationError.value
);

const handleLogin = () => {
  loginMutate({ email: email.value, password: password.value });
};

const success = (idToken: string, user: string) => {
  const jwt = jose.decodeJwt(idToken);

  const parsedUser = user !== '' ? JSON.parse(user) : {};

  if (jwt.iss === 'https://appleid.apple.com') {
    appleLoginMutate({
      idToken,
      givenName: parsedUser.name?.firstName,
      familyName: parsedUser.name?.lastName
    });
  } else {
    googleLoginMutate({ idToken });
  }
};

const errorHandler = (error: string) => {
  oauth2_error.value = error;
};
</script>

<template>
  <h1 class="text-xl sm:text-2xl">
    <TranslatedText identifier="auth.login.title" />
  </h1>
  <div class="flex flex-col items-center gap-y-4 sm:gap-y-6">
    <div
      v-if="error"
      class="text-sm sm:text-base text-red-600 p-3 bg-red-50 rounded-lg w-full"
    >
      <TranslatedText identifier="common.error_prefix" />
      <span class="ml-1">{{ error }}</span>
    </div>
    <div
      v-if="isPending"
      class="text-sm sm:text-base"
    >
      <TranslatedText identifier="states.loading" />
    </div>
    <div
      v-else
      class="flex flex-col items-center gap-y-4 sm:gap-y-6 w-full"
    >
      <div class="flex flex-col items-center gap-y-3 sm:gap-y-4 w-full">
        <div class="flex flex-col gap-x-2 gap-y-3 sm:gap-y-4 w-full">
          <div class="w-full">
            <label
              for="email"
              class="block text-xs sm:text-sm font-medium mb-1.5"
            >
              <TranslatedText identifier="labels.email" />
            </label>
            <input
              id="email"
              v-model="email"
              name="mail"
              type="email"
              :placeholder="t('placeholders.email')"
              class="w-full p-3 border rounded text-sm sm:text-base touch-manipulation"
              autocomplete="email"
            />
          </div>
          <div class="w-full">
            <RevealablePasswordInput
              v-model="password"
              name="pass"
              :placeholder="t('placeholders.password')"
              class="w-full p-3 border rounded text-sm sm:text-base touch-manipulation"
            >
              <div
                class="text-xs sm:text-sm font-medium mb-1.5 flex flex-row justify-between items-center"
              >
                <span><TranslatedText identifier="labels.password" /></span>
                <RouterLink
                  to="/ucet/zapomenute-heslo"
                  class="text-blue-600 hover:underline"
                >
                  <TranslatedText identifier="buttons.forgotten_password" />
                </RouterLink>
              </div>
            </RevealablePasswordInput>
          </div>
        </div>
        <button
          class="primary py-3 px-4 w-full text-sm sm:text-base touch-manipulation"
          type="submit"
          :disabled="isPending"
          @click="handleLogin"
        >
          <TranslatedText identifier="buttons.login" />
        </button>
        <AuthButtons
          @success="success"
          @error="errorHandler"
        />
      </div>
    </div>
  </div>
</template>
