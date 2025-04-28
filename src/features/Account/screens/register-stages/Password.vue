<script setup lang="ts">
import { ref } from 'vue';
import { registerStore } from '@/features/Account/state/RegisterStore';
import RevealablePasswordInput from '@/features/RevealablePasswordInput/components/RevealablePasswordInput.vue';

const password = ref('');
const passwordAgain = ref('');

const handleRegister = () => {
  if (password.value !== passwordAgain.value) {
    alert("Hesla se neshodují.");
    return;
  }

  registerStore.setPassword(password.value);
  registerStore.nextStage();
};
</script>

<template>
  <h1>Nastavte si heslo</h1>
  <form @submit.prevent="handleRegister" class="flex flex-col">
    <RevealablePasswordInput v-model="password" label="Heslo" />
    <RevealablePasswordInput v-model="passwordAgain" label="Heslo znovu" />
    <button class="primary p-2 m-2" type="submit">Pokračovat</button>
  </form>
</template>
