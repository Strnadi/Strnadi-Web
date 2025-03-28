<script setup lang="ts">
import { ref } from 'vue';
import { registerStore } from '@/state/RegisterStore';

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
  <div @submit.prevent="handleRegister" class="flex flex-col">
    <input v-model="password" type="password" placeholder="Heslo" />
    <input v-model="passwordAgain" type="password" placeholder="Heslo znovu" />
    <button class="primary p-2 m-2" type="submit">Pokračovat</button>
  </div>
</template>
