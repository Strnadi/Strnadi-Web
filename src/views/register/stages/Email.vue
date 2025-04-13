<script setup lang="ts">
import * as jose from 'jose';
import { ref } from "vue";
import { registerStore } from "@/state/RegisterStore"; // Adjust the import based on your store structure
import { useMutation} from "@tanstack/vue-query";
import { getUserExists, postGoogleSignup } from "@/api/account";
import { useRoute, useRouter } from "vue-router";
import type { JWTObject } from "@/api/types/auth";
import type { OAuth2SignUpResponse } from "@/api/types/oauth2";
import OAuth2Button from "@/components/oauth2-button/OAuth2Button.vue";

const env = import.meta.env;
const router = useRouter();
const route = useRoute();
const agreement = ref(false);

const oauth2_url = "https://accounts.google.com/o/oauth2/v2/auth";
const oauth2_clientId = env.VITE_GOOGLE_CLIENT_ID;
const oauth2_redirectUri = env.VITE_PUBLIC_URL + "/ucet/registrace";
const oauth2_scope = "email profile";
const oauth2_responseType = "token id_token";
const oauth2_prompt = "consent";

const error = ref("");

const { mutate: googleSignupMutate, isPending, isError } = useMutation({
  mutationFn: ({ idToken }: { idToken: string }) => postGoogleSignup({ idToken }),

  onSuccess: (signupJWT: OAuth2SignUpResponse) => {
    const userJWT: JWTObject = jose.decodeJwt(signupJWT.jwt);

    registerStore.setName(signupJWT.firstName);
    registerStore.setSurname(signupJWT.lastName);
    registerStore.setEmail(userJWT.sub!);
    registerStore.nextStage();
  },

  onError: (err) => {
    error.value = err.message;
  },
})

const googleSignup = (idToken: string) => {
  googleSignupMutate({ idToken })
}

const checkEmail = async () => {
  const exists = await getUserExists(registerStore.email);

  if (!exists) {
    registerStore.nextStage();
  } else {
    error.value = "Tento e-mail je již registrován.";
  }
}

</script>

<template>
  <h1>Zadejte váš e-mail</h1>
  <template v-if="isPending">Načítání...</template>
  <template v-else>
    <template v-if="isError"><span class="text-red-500">Chyba: {{ error }}</span></template>
    <div class="flex flex-col gap-y-4">
      <form class="flex flex-col gap-y-2" @submit.prevent="checkEmail">
        <input v-model="registerStore.email" name="email" type="email" required placeholder="E-Mail" />
        <div class="flex flex-row items-center gap-x-2">
          <input type="checkbox" id="agreement" v-model="agreement" />
          <label for="agreement">
            <span class="text-sm">Zapojením do projektu občanské vědy Nářečí českých strnadů <PrefetchLink to="/podminky-pouziti" class="underline">souhlasím s podmínkami</PrefetchLink></span>
          </label>
        </div>
        <button class="primary p-2" :disabled="!agreement" type="submit">Pokračovat</button>
      </form>
      <OAuth2Button
        class="secondary p-2 max-lg:w-full w-full"
        type="submit"
        :disabled="isPending || !agreement"
        :oauth2_url="oauth2_url"
        :client-id="oauth2_clientId"
        :redirect-uri="oauth2_redirectUri"
        :prompt="oauth2_prompt"
        :response-type="oauth2_responseType"
        :scope="oauth2_scope"
        @success="googleSignup"
      >
        Registrovat se přes Google
      </OAuth2Button>
    </div>
  </template>
</template>
