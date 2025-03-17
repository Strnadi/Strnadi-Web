<!-- filepath: /home/hroudis/strnadi-vue/src/views/register/stages/FinalConfirm.vue -->
<template>
  <div v-if="isPending">
    <p>Vytváření účtu...</p>
  </div>

  <div v-else-if="isError">
    <h1>Chyba</h1>
    <p>{{ error.message }}</p>
    <button @click="register">Zkusit znovu</button>
  </div>

  <div v-else>
    <h1>Úspěch</h1>
    <h2>Váš účet byl založen.</h2>
    <button class="primary" @click="onClick">Pokračovat</button>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMutation } from '@tanstack/vue-query'
import { postRegister } from '@/api/account'
import { accountStore } from '@/state/AccountStore'
import { registerStore } from '@/state/RegisterStore'
import type { SignUpRequest } from '@/api/types/auth'

const router = useRouter()

const { mutate, isError, isPending, data, error } = useMutation({
  mutationFn: (data: SignUpRequest) => postRegister(data)
})

// Function to call the registration mutation
const register = () => {
  mutate({
    email: registerStore.email,
    firstName: registerStore.name,
    lastName: registerStore.surname,
    nickname: registerStore.nickname,
    password: registerStore.password,
    consent: true // the user can't reach this point without consenting
  })
}

onMounted(() => {
  register()
})

const onClick = () => {
  router.replace('/');
  registerStore.resetStage();
  if (data.value) {
    accountStore.login(data.value)
  }
}
</script>

<style scoped>
/* You can add component specific CSS here if needed */
</style>
