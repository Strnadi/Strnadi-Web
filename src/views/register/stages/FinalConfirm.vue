<!-- filepath: /home/hroudis/strnadi-vue/src/views/register/stages/FinalConfirm.vue -->
<template>
  <div v-if="mutation.isPending && !mutation.isIdle">
    <p>Vytváření účtu...</p>
  </div>

  <div v-else-if="mutation.isError">
    <h1>Chyba</h1>
    <p>{{ mutation.error.message }}</p>
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

// Create a mutation using vue-query
const mutation = useMutation({
  mutationFn: (data: SignUpRequest) => postRegister(data)
})

// Function to call the registration mutation
const register = () => {
  mutation.mutate({
    email: registerStore.email,
    firstName: registerStore.name,
    lastName: registerStore.surname,
    nickname: registerStore.nickname,
    password: registerStore.password,
    consent: true // the user can't reach this point without consenting
  })
}

// Run the registration on component mount
onMounted(() => {
  register()
})

// When user clicks "Pokračovat" update the session and navigate back
const onClick = () => {
  router.back();
  registerStore.resetStage()
  if (mutation.data.value) {
    accountStore.login(mutation.data.value)
  }
}
</script>

<style scoped>
/* You can add component specific CSS here if needed */
</style>
