<script lang="ts">
export interface OAuthPopupResult {
  message: string;
  data: string;
  state: string;
  user?: string;
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
import { onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import {
  createOAuthTransaction,
  validateOAuthResponse
} from '@/utils/oauth';

const env = import.meta.env;

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
  const state = params.get('state');
  const user = params.get('user');

  if (!idToken || !state) {
    emit('error', 'No token returned');
    return;
  }

  try {
    validateOAuthResponse(state, idToken);
  } catch (error) {
    emit('error', error instanceof Error ? error.message : 'Invalid login');
    return;
  }

  emit('success', idToken, user ?? '');
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
  const providerUrl = new URL(url);
  const { state, nonce } = createOAuthTransaction(
    clientId,
    providerUrl.origin
  );
  providerUrl.searchParams.set('client_id', clientId);
  providerUrl.searchParams.set('redirect_uri', redirectUri);
  providerUrl.searchParams.set('scope', scope);
  providerUrl.searchParams.set('response_type', responseType);
  providerUrl.searchParams.set('nonce', nonce);
  providerUrl.searchParams.set('state', state);
  if (prompt) providerUrl.searchParams.set('prompt', prompt);
  if (responseMode) providerUrl.searchParams.set('response_mode', responseMode);
  const oauthUrl = providerUrl.toString();

  if (!props.popup) {
    window.location.href = oauthUrl;
  } else {
    const popup = window.open(oauthUrl, '_blank', 'width=600,height=600');

    if (!popup) {
      console.error('Failed to open popup');
      return;
    }

    let completed = false;
    const cleanup = () => {
      completed = true;
      window.removeEventListener('message', handleMessage);
      window.clearInterval(closePoll);
    };
    const handleMessage = (event: MessageEvent<OAuthPopupResult>) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== popup ||
        event.data?.state !== state
      ) {
        return;
      }

      cleanup();
      popup.close();
      if (event.data.message === 'success') {
        try {
          validateOAuthResponse(state, event.data.data);
          emit('success', event.data.data, event.data.user ?? '');
        } catch (error) {
          emit(
            'error',
            error instanceof Error ? error.message : 'Invalid login'
          );
        }
      } else if (event.data.message === 'error') {
        emit('error', event.data.data);
      }
    };
    window.addEventListener('message', handleMessage);

    const closePoll = window.setInterval(() => {
      if (!completed && popup.closed) {
        cleanup();
        sessionStorage.removeItem(`strnadi.oauth.${state}`);
        emit('error', 'Login window was closed');
      }
    }, 500);
  }
};

const login = () => {
  const url = props.url;
  const clientId = props.clientId;
  const redirectUri = props.redirectUrl ?? window.location.href;
  const scope = props.scope;
  const responseType = props.responseType;
  const prompt = props.prompt ?? undefined;
  const responseMode = props.responseMode ?? undefined;

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
