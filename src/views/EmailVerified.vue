<script setup lang="ts">
import LogoNoText from '@/assets/logo-no-text.svg';
</script>

<template>
  <div class="flex flex-col items-center gap-y-6 w-full">
    <div class="flex flex-col items-center gap-y-3">
      <img :src="LogoNoText" />
      <h2>Nářečí českých strnadů</h2>
    </div>
    <button class="primary p-2 w-full">
      <div class="lg:hidden">Zpět do aplikace</div>
      <div class="max-lg:hidden">Dokončit registraci</div>
    </button>
  </div>
</template>
