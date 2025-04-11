<script setup lang="ts">
import * as jose from 'jose';
import { onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { v4 as uuidv4 } from 'uuid';

const router = useRouter();
const route = useRoute();

const props = defineProps<{
  clientId: string,
  redirectUri: string,
  scope: string,
  responseType: string,
  prompt: string,
  disabled?: boolean
}>();

const emit = defineEmits<{
  success: [idToken: string],
  error: [error: Error]
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
    emit('error', new Error("No token returned"))
    return;
  }

  const decodedToken = jose.decodeJwt(idToken);

  if(!decodedToken.nonce || decodedToken.nonce !== state) {
    emit('error', new Error("Nonce mismatch"))
    return;
  }

  emit('success', idToken);
  router.replace({ hash: '' })
});

const submitLogin = (url: string, clientId: string, redirectUri: string, scope: string, responseType: string, prompt: string) => {
  const nonce = uuidv4();

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
  const clientId = props.clientId;
  const redirectUri = encodeURIComponent(props.redirectUri);
  const scope = encodeURIComponent(props.scope);
  const responseType = props.responseType;
  const prompt = props.prompt;

  submitLogin(window.location.href, clientId, redirectUri, scope, responseType, prompt);
}

</script>

<template>
  <button
    @click="login"
    :disabled="disabled"
    class="secondary p-2 max-lg:w-full w-full"
    type="submit"
  >
    Přihlásit se přes Google
  </button>
</template>
