<script setup lang="ts">
import LogoNoText from '@/assets/logo-no-text.svg';
</script>

<template>
  <div class="flex flex-col items-center gap-y-6 w-full">
    <div class="flex flex-col items-center gap-y-3">
      <img :src="LogoNoText" />
      <h2>Nářečí českých strnadů</h2>
    </div>
    <span class="text-xl text-center">E-Mail byl úspěšně ověřen.</span>
    <a class="button-primary p-2 w-full lg:hidden text-center" href="com.delta.strnadi://">Zpět do aplikace</a>
    <RouterLink class="button-primary p-2 w-full max-lg:hidden text-center" :replace="true" to="/">Dokončit registraci</RouterLink>
  </div>
</template>
