<script setup lang="ts">
import OAuth2Button from './OAuthButton.vue';
import TranslatedText from './TranslatedText.vue';
const env = import.meta.env;

const oauth2_url = "https://appleid.apple.com/auth/authorize";
const oauth2_clientId = env.VITE_APPLE_CLIENT_ID;
const oauth2_scope = "name email";
const oauth2_responseType = "code id_token";
const oauth2_responseMode = "form_post";
// const oauth2_prompt = "select_account";

</script>

<template>
  <OAuth2Button
    class="secondary p-2 max-lg:w-full w-full !bg-gray-900 !text-white"
    :url="oauth2_url"
    :client-id="oauth2_clientId"
    :response-type="oauth2_responseType"
    :response-mode="oauth2_responseMode"
    :scope="oauth2_scope"
    :redirect-url="`${env.VITE_API_URL}/auth/apple-callback`"
  >
    <TranslatedText identifier="buttons.continue_apple" />
  </OAuth2Button>
</template>
