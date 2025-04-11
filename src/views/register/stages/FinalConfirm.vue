<script setup lang="ts">
import { registerStore } from '@/state/RegisterStore';

</script>

<template>
  <h1>Potvrzení</h1>
  <h2>Je takto všechno správně?</h2>
  <span>E-mail: {{ registerStore.email }}</span>
  <span>Jméno: {{ registerStore.name }}</span>
  <span>Příjmení: {{ registerStore.surname }}</span>
  <span>Přezdívka: {{ registerStore.nickname }}</span>
  <span>PSČ: {{ registerStore.postalCode }}</span>
  <span>Město: {{ registerStore.city }}</span>
  <span>S podmínkami použití souhlasím.</span>
  <button class="primary p-2 m-2" @click="registerStore.nextStage">Pokračovat</button>
</template>
