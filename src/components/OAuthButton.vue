<script lang="ts">

export interface OAuthPopupResult {
  message: string;
  data: string;
};

export interface OAuthButtonProps {
  url: string;
  clientId: string;
  scope: string;
  responseType: string;
  prompt: string;
  callback?: string; // If specified, the login will be done in a popup
  disabled?: boolean;
};

</script>


<script setup lang="ts">
import * as jose from 'jose';
import { onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

const props = defineProps<OAuthButtonProps>();

const emit = defineEmits<{
  success: [idToken: string],
  error: [error: string]
}>();

onMounted(() => {
  if(props.callback || !route.hash) {
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

  const oauthUrl = (
    url +
    `?client_id=${clientId}` +
    `&redirect_uri=${redirectUri}` +
    `&scope=${scope}` +
    `&response_type=${responseType}` +
    `&prompt=${prompt}` +
    `&nonce=${nonce}` +
    `&state=${nonce}`
  );

  if(!props.callback) {
    window.location.href = oauthUrl;
  } else {
    const popup = window.open(oauthUrl, '_blank', 'width=600,height=600');

    if (!popup) {
      console.error("Failed to open popup");
      return;
    }

    popup.addEventListener('message', (event: MessageEvent<OAuthPopupResult>) => {
      if (event.data.message === 'success') {
        const idToken = event.data.data;
        emit('success', idToken);
        popup.close();
      } else if (event.data.message === 'error') {
        emit('error', event.data.data);
        popup.close();
      }
    })

    popup.addEventListener('close', () => {
      console.error("Popup closed before completing the login flow");
    })
  }
};

const login = () => {
  const url = props.url;
  const clientId = props.clientId;
  const redirectUri = encodeURIComponent(props.callback ?? window.location.href);
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
    type="button"
  >
    <slot />
  </button>
</template>
