<script lang="ts">
export interface OAuthPopupResult {
  message: string;
  data: string;
}

export interface OAuthButtonProps {
  url: string;
  clientId: string;
  scope: string;
  responseType: string;
  responseMode?: string;
  prompt?: string;
  popup?: boolean;
  redirectUrl?: string; // If specified, the login will be done in a popup
  disabled?: boolean;
}
</script>

<script setup lang="ts">
import * as jose from 'jose';
import { onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const env = process.env;

const router = useRouter();
const route = useRoute();

const props = defineProps<OAuthButtonProps>();

const emit = defineEmits<{
  success: [idToken: string, user: string];
  error: [error: string];
}>();

onMounted(() => {
  if (props.popup || !route.hash) {
    return;
  }

  const fragment = route.hash.substring(1);
  const params = new URLSearchParams(fragment);
  const idToken = params.get('id_token');
  // const state = params.get('state');
  const user = params.get('user');

  if (!idToken) {
    emit('error', 'No token returned');
    return;
  }

  const decodedToken = jose.decodeJwt(idToken);
  console.log(decodedToken);

  // if(!decodedToken['nonce'] || decodedToken['nonce'] !== state) {
  //   emit('error', "Nonce mismatch")
  //   return;
  // }

  emit('success', idToken, user);
  router.replace({ hash: '' });
});

const submitLogin = (
  url: string,
  clientId: string,
  redirectUri: string,
  scope: string,
  responseType: string,
  responseMode?: string,
  prompt?: string
) => {
  const nonce = encodeURIComponent(
    `${window.location.href}|${Math.random().toString()}`
  );

  const oauthUrl =
    url +
    `?client_id=${clientId}` +
    `&redirect_uri=${redirectUri}` +
    `&scope=${scope}` +
    `&response_type=${responseType}` +
    `&nonce=${nonce}` +
    `&state=${nonce}` +
    (prompt ? `&prompt=${prompt}` : '') +
    (responseMode ? `&response_mode=${responseMode}` : '');

  if (!props.popup) {
    window.location.href = oauthUrl;
  } else {
    const popup = window.open(oauthUrl, '_blank', 'width=600,height=600');

    if (!popup) {
      console.error('Failed to open popup');
      return;
    }

    popup.addEventListener(
      'message',
      (event: MessageEvent<OAuthPopupResult>) => {
        if (event.data.message === 'success') {
          const idToken = event.data.data;
          emit('success', idToken);
          popup.close();
        } else if (event.data.message === 'error') {
          emit('error', event.data.data);
          popup.close();
        }
      }
    );

    popup.addEventListener('close', () => {
      console.error('Popup closed before completing the login flow');
    });
  }
};

const login = () => {
  const url = props.url;
  const clientId = props.clientId;
  const redirectUri = encodeURIComponent(
    props.redirectUrl ?? window.location.href
  );
  const scope = encodeURIComponent(props.scope);
  const responseType = encodeURIComponent(props.responseType);
  const prompt = props.prompt ? encodeURIComponent(props.prompt) : null;
  const responseMode = props.responseMode
    ? encodeURIComponent(props.responseMode)
    : null;

  submitLogin(
    url,
    clientId,
    redirectUri,
    scope,
    responseType,
    responseMode,
    prompt
  );
};
</script>

<template>
  <button
    :disabled="disabled"
    type="button"
    @click="login"
  >
    <slot />
  </button>
</template>
