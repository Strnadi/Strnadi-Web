<route>
meta:
  layout: empty
</route>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useCountdown } from '@vueuse/core';
import { type OAuthPopupResult } from '@/components/OAuthButton.vue';
import * as jose from 'jose';

const SuccessTimeout = 5; // seconds

const { remaining, start } = useCountdown(SuccessTimeout, {

  immediate: false,
  interval: 1000,
  onComplete: window.close.bind(window)

});


const postMessage = (message: OAuthPopupResult) => (window.opener as Window).postMessage(message);

onMounted(() => {
  const route = window.location;

  if(!route.hash) {
    return;
  };

  const fragment = route.hash.substring(1);
  const params = new URLSearchParams(fragment);
  const idToken = params.get('id_token');
  const state = params.get('state');

  if (!idToken) {
    postMessage({
      message: 'error',
      data: "No token returned"
    });

    return;
  }

  const decodedToken = jose.decodeJwt(idToken);

  if(!decodedToken.nonce || decodedToken.nonce !== state) {
    postMessage({
      message: 'error',
      data: "Nonce mismatch"
    });

    return;
  }

  postMessage({
    message: 'success',
    data: idToken
  });

  start();
});

</script>

<template>
  <h1>Návrat do aplikace</h1>
  <span>Nyní se můžete bezpečně vrátit zpět do aplikace.</span>
  <span>Toto okno se zavře automaticky za {{ remaining }}.</span>
</template>
