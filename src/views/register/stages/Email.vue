<script setup lang="ts">
import { onMounted, ref } from "vue";
import { registerStore } from "@/state/RegisterStore"; // Adjust the import based on your store structure
import { useMutation} from "@tanstack/vue-query";
import { getUserExists, postGoogleLogin, postGoogleSignup } from "@/api/account";
import { accountStore } from "@/state/AccountStore";
import { useRoute, useRouter } from "vue-router";
import { externalAuthStore } from "@/state/ExternalAuthStore";
import * as jose from 'jose';
import type { JWTObject } from "@/api/types/auth";
import type { OAuth2SignUpResponse } from "@/api/types/oauth2";

const router = useRouter();
const route = useRoute();
const env = import.meta.env;
const agreement = ref(false);

const { mutate: googleSignupMutate, isPending, isError, error } = useMutation({
  mutationFn: ({ idToken }: { idToken: string }) => postGoogleSignup({ idToken }),

  onSuccess: (signupJWT: OAuth2SignUpResponse) => {
    router.replace({
      path: route.path,
      query: route.query,
      hash: ''
    });

    const userJWT: JWTObject = jose.decodeJwt(signupJWT.jwt);

    registerStore.setName(signupJWT.firstName);
    registerStore.setSurname(signupJWT.lastName);
    registerStore.setEmail(userJWT.sub!);
    registerStore.nextStage();
  },

  onError: (error) => {
    console.error("Error during Google signup:", error);
  },
})

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

  googleSignupMutate({ idToken });
});

const googleSignup = () => {
  const clientId = env.VITE_GOOGLE_CLIENT_ID;
  const redirectUri = encodeURIComponent(env.VITE_PUBLIC_URL + "/ucet/registrace");
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

const checkEmail = async () => {
  const exists = await getUserExists(registerStore.email);

  if (!exists) {
    registerStore.nextStage();
  } else {
    alert("Tento e-mail je již registrován.");
  }
}

</script>

<template>
  <h1>Zadejte váš e-mail</h1>
  <template v-if="isError"></template>
  <template v-else-if="isPending"></template>
  <div v-else class="flex flex-col gap-y-4">
    <form class="flex flex-col gap-y-2" @submit.prevent="checkEmail">
      <input v-model="registerStore.email" name="email" type="email" required placeholder="E-Mail" />
      <div class="flex flex-row items-center gap-x-2">
        <input type="checkbox" id="agreement" v-model="agreement" />
        <label for="agreement">
          <span class="text-sm">Zapojením do projektu občanské vědy Nářečí českých strnadů <PrefetchLink to="/podminky-pouziti" class="underline">souhlasím s podmínkami</PrefetchLink></span>
        </label>
      </div>
      <button class="primary p-2 m-2" :disabled="!agreement" type="submit">Pokračovat</button>
    </form>
    <button
      class="secondary p-2 max-lg:w-full w-full"
      type="submit"
      :disabled="isPending"
      @click="googleSignup"
    >
      Registrovat se přes Google
    </button>
  </div>
</template>
