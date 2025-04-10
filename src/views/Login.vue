<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useMutation } from "@tanstack/vue-query";
import { postGoogleLogin, postLogin } from "@/api/account";
import { accountStore } from "@/state/AccountStore";

import LogoNoText from "@/assets/logo-no-text.svg";
import OAuth2Button from "@/components/oauth2-button/OAuth2Button.vue";

const env = import.meta.env;

const router = useRouter();

const oauth2_url = "https://accounts.google.com/o/oauth2/v2/auth";
const oauth2_clientId = env.VITE_GOOGLE_CLIENT_ID;
const oauth2_redirectUri = env.VITE_PUBLIC_URL + "/ucet/prihlaseni";
const oauth2_scope = "email profile";
const oauth2_responseType = "token id_token";
const oauth2_prompt = "select_account";


const { mutate: googleLoginMutate, isPending: googleLoginPending, error: googleLoginError } = useMutation({
  mutationFn: (loginInfo: { idToken: string }) =>
    postGoogleLogin(loginInfo),

  onSuccess: (data) => {
    router.replace('/');
    accountStore.login(data);
  },
});

const { mutate: loginMutate, isPending: loginPending, error: loginError } = useMutation({
  mutationFn: (loginInfo: { email: string; password: string }) =>
    postLogin(loginInfo),

  onSuccess: (data) => {
    router.back();
    accountStore.login(data);
  },
});

const isPending = computed(() => loginPending.value || googleLoginPending.value)
const error = computed(() => loginError.value || googleLoginError.value)

const email = ref("");
const password = ref("");

const handleLogin = () => {
  loginMutate({ email: email.value, password: password.value });
};

const googleLogin = (idToken: string) => {
  googleLoginMutate({ idToken })
}
</script>

<template>
  <div class="flex flex-col items-center gap-y-6 w-full">
    <img :src="LogoNoText" />
    <h1 class="text-center">Nářečí českých strnadů</h1>
    <span class="text-xl text-center">Nahrávejte, mapujte, dobývejte</span>

    <div v-if="error">Chyba: {{ error }}</div>
    <div v-if="isPending">Načítání...</div>
    <div v-else class="flex flex-col items-center gap-y-6 w-full">
      <div
        class="flex flex-col items-center gap-y-2 w-[75%] max-lg:w-full"
      >
        <div class="flex flex-col gap-x-2 gap-y-4 w-full">
          <div>
            <label for="email" class="block text-sm font-medium mb-1">E-Mail</label>
            <input
              id="email"
              v-model="email"
              name="mail"
              type="email"
              placeholder="E-Mail"
              class="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label
              for="password"
              class="text-sm font-medium mb-1 flex flex-row justify-between"
            >
              <span>Heslo</span>
              <PrefetchLink to="/ucet/zapomenute-heslo">Zapomenuté heslo</PrefetchLink>
            </label>
            <input
              id="password"
              v-model="password"
              name="pass"
              type="password"
              placeholder="Heslo"
              class="w-full p-2 border rounded"
            />
          </div>
        </div>
        <button
          class="primary p-2 max-lg:w-full w-full"
          type="submit"
          :disabled="isPending"
          @click="handleLogin"
        >
          Přihlásit se
        </button>
        <OAuth2Button
          class="secondary p-2 max-lg:w-full w-full"
          type="submit"
          :disabled="isPending"
          :oauth2_url="oauth2_url"
          :client-id="oauth2_clientId"
          :redirect-uri="oauth2_redirectUri"
          :prompt="oauth2_prompt"
          :response-type="oauth2_responseType"
          :scope="oauth2_scope"
          @success="googleLogin"
        >
          Přihlásit se přes Google
        </OAuth2Button>
      </div>
      <PrefetchLink
        class="button-secondary p-2 max-lg:w-full w-[75%] text-center"
        to="/ucet/registrace"
      >
        Založit účet
      </PrefetchLink>
    </div>
  </div>
</template>
