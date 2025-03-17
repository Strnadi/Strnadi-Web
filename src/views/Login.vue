<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMutation } from '@tanstack/vue-query';
import { postLogin } from '@/api/account';
import { accountStore } from '@/state/AccountStore';

import LogoNoText from '@/assets/logo-no-text.svg';

const router = useRouter();

const email = ref('');
const password = ref('');

const { mutate, isPending, error } = useMutation({
  mutationFn: (loginInfo: { email: string; password: string }) => postLogin(loginInfo),
  onSuccess: (data) => {
    router.replace('/');
    accountStore.login(data);
  }
});


const handleLogin = () => {
  mutate({ email: email.value, password: password.value });
};

const navigateToRegister = () => {
  router.push("/registrace");
};
</script>

<template>
  <div class="flex flex-col items-center gap-y-6 w-full">
    <img :src="LogoNoText" />
    <h1>Nářečí českých strnadů</h1>
    <span class="text-xl">Nahrávejte, mapujte, dobývejte</span>

    <div v-if="error">Chyba: {{ error }}</div>
    <div v-if="isPending">Načítání...</div>
    <div v-else class="flex flex-col gap-y-4">
      <form class="flex flex-col w-full gap-y-2" @submit.prevent="handleLogin">
        <div class="flex flex-col gap-x-2 gap-y-4 w-full">
            <div>
              <label for="email" class="block text-sm font-medium mb-1">E-Mail</label>
              <input id="email" v-model="email" name="mail" type="email" placeholder="E-Mail" class="w-full p-2 border rounded" />
            </div>
            <div>
              <label for="password" class="block text-sm font-medium mb-1 flex flex-row justify-between"><span>Heslo</span><button>Zapomenuté heslo</button></label>
              <input id="password" v-model="password" name="pass" type="password" placeholder="Heslo" class="w-full p-2 border rounded" />
            </div>
        </div>
        <button class="primary p-2" type="submit" :disabled="isPending">
          Přihlásit se
        </button>
      </form>
      <button class="secondary p-2" @click="navigateToRegister">
        Založit účet
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Add component-specific styles here if needed */
</style>
