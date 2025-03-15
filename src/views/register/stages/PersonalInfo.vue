<script setup lang="ts">
import { ref } from 'vue';
import { registerStore } from '@/state/RegisterStore'

</script>

<template>
  <div>
    <form class="flex flex-col">
      <input v-model="registerStore.name" type="text" placeholder="Jméno" />
      <input v-model="registerStore.surname" type="text" placeholder="Příjmení" />
      <input v-model="registerStore.nickname" type="text" placeholder="Přezdívka" />
      <button class="primary p-2 m-2" @click="registerStore.nextStage">Pokračovat</button>
    </form>
  </div>
</template>
