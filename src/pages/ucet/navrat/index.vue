<route lang="yaml">
meta:
  layout: empty
</route>

<script setup vapor lang="ts">
import { onMounted } from 'vue';
import { useCountdown } from '@vueuse/core';
import { type OAuthPopupResult } from '@/components/OAuthButton.vue';
import TranslatedText, { t } from '@/components/TranslatedText.vue';

const SuccessTimeout = 5; // seconds

const { remaining, start } = useCountdown(SuccessTimeout, {
  immediate: false,
  interval: 1000,
  onComplete: window.close.bind(window)
});

const postMessage = (message: OAuthPopupResult) => {
  if (window.opener) {
    window.opener.postMessage(message, window.location.origin);
  }
};

onMounted(() => {
  const route = window.location;

  if (!route.hash) {
    return;
  }

  const fragment = route.hash.substring(1);
  const params = new URLSearchParams(fragment);
  const idToken = params.get('id_token');
  const state = params.get('state');
  const user = params.get('user') ?? '';

  if (!idToken || !state) {
    postMessage({
      message: 'error',
      data: 'No token or state returned',
      state: state ?? ''
    });

    return;
  }

  postMessage({
    message: 'success',
    data: idToken,
    state,
    user
  });

  start();
});
</script>

<template>
  <h1>
    <TranslatedText identifier="account.return.title" />
  </h1>
  <span>
    <TranslatedText identifier="account.return.message" />
  </span>
  <span> {{ t('account.return.auto_close') }} {{ remaining }}s. </span>
</template>
