<template>
  <template v-if="isPending">
    <p>Vytváření účtu...</p>
  </template>

  <template v-else-if="isError">
    <h1>Chyba</h1>
    <p>{{ error!.message }}</p>
    <button @click="register" class="secondary p-2 w-full">Zkusit znovu</button>
  </template>

  <template v-else>
    <h1>Úspěch</h1>
    <h2>Gratulace! Váš účet byl založen.</h2>
    <span class="font-medium">Na vaši e-mailovou adresu vám zakrátko přijde ověřovací odkaz, přes který si ověříte váš účet.</span>
    <button class="primary p-2 w-full" @click="onClick">Pokračovat</button>
  </template>
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
  mutationFn: (data: SignUpRequest) => postRegister(data),

  onSuccess: () => {
    registerStore.reset();
  },
})

// Function to call the registration mutation
const register = () => {
  mutate({
    email: registerStore.email,
    firstName: registerStore.name,
    lastName: registerStore.surname,
    nickname: registerStore.nickname,
    password: registerStore.password,
    postCode: registerStore.postCode,
    city: registerStore.city,
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
