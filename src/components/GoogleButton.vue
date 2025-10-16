<script setup lang="ts">
import OAuth2Button from './OAuthButton.vue';
import TranslatedText from './TranslatedText.vue';
const env = import.meta.env;

const oauth2_url = "https://accounts.google.com/o/oauth2/v2/auth";
const oauth2_clientId = env.VITE_GOOGLE_CLIENT_ID;
const oauth2_scope = "email profile";
const oauth2_responseType = "token id_token";
const oauth2_prompt = "select_account";

</script>

<template>
  <OAuth2Button
    class="secondary p-2 max-lg:w-full w-full"
    :url="oauth2_url"
    :client-id="oauth2_clientId"
    :prompt="oauth2_prompt"
    :response-type="oauth2_responseType"
    :scope="oauth2_scope"
  >
    <TranslatedText identifier="buttons.continue_google" />
  </OAuth2Button>
</template>
