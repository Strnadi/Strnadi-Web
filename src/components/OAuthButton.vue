<script setup lang="ts">
import * as jose from 'jose';
import { onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

const props = defineProps<{
  oauth2_url: string,
  clientId: string,
  scope: string,
  responseType: string,
  prompt: string,
  disabled?: boolean
}>();

const emit = defineEmits<{
  success: [idToken: string],
  error: [error: string]
}>();

onMounted(() => {
  if(!route.hash) {
    return;
  };

  const fragment = route.hash.substring(1);
  const params = new URLSearchParams(fragment);
  const idToken = params.get('id_token');
  const state = params.get('state');

  if (!idToken) {
    emit('error', "No token returned")
    return;
  }

  const decodedToken = jose.decodeJwt(idToken);

  if(!decodedToken.nonce || decodedToken.nonce !== state) {
    emit('error', "Nonce mismatch")
    return;
  }

  emit('success', idToken);
  router.replace({ hash: '' })
});

const submitLogin = (url: string, clientId: string, redirectUri: string, scope: string, responseType: string, prompt: string) => {
  const nonce = Math.random().toString();

  window.location.href = (
    url +
    `?client_id=${clientId}` +
    `&redirect_uri=${redirectUri}` +
    `&scope=${scope}` +
    `&response_type=${responseType}` +
    `&prompt=${prompt}` +
    `&nonce=${nonce}` +
    `&state=${nonce}`
  );
}

const login = () => {
  const url = props.oauth2_url;
  const clientId = props.clientId;
  const redirectUri = encodeURIComponent(window.location.href);
  const scope = encodeURIComponent(props.scope);
  const responseType = encodeURIComponent(props.responseType);
  const prompt = encodeURIComponent(props.prompt);

  submitLogin(url, clientId, redirectUri, scope, responseType, prompt);
}

</script>

<template>
  <button
    @click="login"
    :disabled="disabled"
    class="secondary p-2 w-full"
    type="button"
  >
    <slot />
  </button>
</template>
