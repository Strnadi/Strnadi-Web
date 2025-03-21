<script setup lang="ts">
import LogoNoText from '@/assets/logo-no-text.svg';
import { useRouter } from 'vue-router';

const router = useRouter();
const goHome = () => router.replace('/');

</script>

<template>
  <div class="flex flex-col items-center gap-y-6 w-full">
    <div class="flex flex-col items-center gap-y-3">
      <img :src="LogoNoText" />
      <h2>Nářečí českých strnadů</h2>
    </div>
    <span class="text-xl text-center">E-Mail nebyl ověřen - nastala chyba.</span>
    <button class="primary p-2 w-full lg:hidden">Zpět do aplikace</button>
    <button class="primary p-2 w-full max-lg:hidden" @click="goHome">Dokončit registraci</button>
  </div>
</template>
