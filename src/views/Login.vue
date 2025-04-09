<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useMutation } from "@tanstack/vue-query";
import { postGoogleLogin, postLogin } from "@/api/account";
import { accountStore } from "@/state/AccountStore";

import LogoNoText from "@/assets/logo-no-text.svg";
import { externalAuthStore } from "@/state/ExternalAuthStore";

import * as jose from 'jose';

const env = import.meta.env;

const router = useRouter();
const route = useRoute();

const { mutate: googleLoginMutate, isPending: googleLoginPending, error: googleLoginError } = useMutation({
  mutationFn: (loginInfo: { idToken: string }) =>
    postGoogleLogin(loginInfo),

  onSuccess: (data) => {
    router.replace({
      path: '/',
      query: route.query,
      hash: ''
    });

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

onMounted(() => {
  if(!route.hash) return;

  const fragment = route.hash.substring(1);
  const params = new URLSearchParams(fragment);
  const idToken = params.get('id_token');

  if (!idToken) {
    return;
  }

  const decodedToken = jose.decodeJwt(idToken);

  if(!decodedToken.nonce || decodedToken.nonce !== externalAuthStore.nonce) {
    console.error("Nonce mismatch");
    return;
  }

  googleLoginMutate({ idToken });
});

const email = ref("");
const password = ref("");

const handleLogin = () => {
  loginMutate({ email: email.value, password: password.value });
};

const googleLogin = () => {
  const clientId = env.VITE_GOOGLE_CLIENT_ID;
  const redirectUri = encodeURIComponent(env.VITE_PUBLIC_URL + "/ucet/prihlaseni");
  const scope = encodeURIComponent("email profile");
  const responseType = "token id_token";
  const prompt = "consent";

  const nonce = Math.random().toString();

  externalAuthStore.setNonce(nonce);

  window.location.href = (
    "https://accounts.google.com/o/oauth2/v2/auth" +
    `?client_id=${clientId}` +
    `&redirect_uri=${redirectUri}` +
    `&scope=${scope}` +
    `&response_type=${responseType}` +
    `&prompt=${prompt}` +
    `&nonce=${nonce}`
  );
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
        <button
          class="secondary p-2 max-lg:w-full w-full"
          type="submit"
          :disabled="isPending"
          @click="googleLogin"
        >
          Přihlásit se přes Google
        </button>
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
