<script setup lang="ts">
import * as jose from 'jose';
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const route = useRoute();

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

router.addRoute({
  path: '/oauth2',
  name: 'OAuth2',
  component: () => import('./OAuth2Component.vue')
});

const props = defineProps<{
  oauth2_url: string,
  clientId: string,
  redirectUri: string,
  scope: string,
  responseType: string,
  prompt: string
}>();

const submitLogin = (url, clientId, redirectUri, scope, responseType, prompt) => {
  const nonce = Math.random().toString();

  window.location.href = (
    url +
    `?client_id=${clientId}` +
    `&redirect_uri=${redirectUri}` +
    `&scope=${scope}` +
    `&response_type=${responseType}` +
    `&prompt=${prompt}` +
    `&nonce=${nonce}` +
    `&state=${btoa(JSON.stringify({ nonce }))}`
  );
}

const login = () => {
  const clientId = props.clientId;
  const redirectUri = encodeURIComponent(props.redirectUri);
  const scope = encodeURIComponent(props.scope);
  const responseType = props.responseType;
  const prompt = props.prompt;

  submitLogin(props.oauth2_url, clientId, redirectUri, scope, responseType, prompt);
}

</script>

<template>

</template>
