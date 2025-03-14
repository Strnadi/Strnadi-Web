<script setup lang="ts">
import { ref } from 'vue';
import { registerStore } from '@/state/RegisterStore'

const name = ref('');
const surname = ref('');
const nickname = ref('');

function handleSubmit() {
  registerStore.setName(name.value);
  registerStore.setSurname(surname.value);
  registerStore.setNickname(nickname.value);
  registerStore.nextStage();
}
</script>

<template>
  <div>
    <form @submit.prevent="handleSubmit" class="flex flex-col">
      <input v-model="name" name="name" type="text" placeholder="Jméno" />
      <input v-model="surname" name="surname" type="text" placeholder="Příjmení" />
      <input v-model="nickname" name="nickname" type="text" placeholder="Přezdívka" />
      <button class="primary p-2 m-2" type="submit">Pokračovat</button>
    </form>
  </div>
</template>
