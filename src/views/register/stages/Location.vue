<template>
  <div>
    <h1>Kde se nacházíte?</h1>
    <form @submit.prevent="handleRegister" class="flex flex-col">
      <input v-model="postalCode" name="postalCode" type="number" placeholder="PSČ" />
      <input v-model="city" name="city" type="text" placeholder="Město" />
      <button class="primary p-2 m-2" type="submit">Pokračovat</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { registerStore } from '@/state/RegisterStore'

const postalCode = ref('')
const city = ref('')

const handleRegister = () => {
  registerStore.setPostalCode(postalCode.value)
  registerStore.setCity(city.value)
  registerStore.nextStage()
}
</script>
