<script setup lang="ts">
import * as jose from 'jose';
import { patchPasswordChange } from '@/features/Account/api';
import RevealablePasswordInput from '@/features/RevealablePasswordInput/components/RevealablePasswordInput.vue';
import { useMutation } from '@tanstack/vue-query';
import { useRouteQuery } from '@vueuse/router';
import { computed, onMounted, ref } from 'vue';

const token = useRouteQuery("token");
const password = ref("");
const passwordConfirm = ref("");

const { mutate, isPending, isIdle, isSuccess, isError, error } = useMutation({
  mutationFn: ({ token, email, newPassword }: {token: string, email: string, newPassword: string}) => patchPasswordChange(token, email, newPassword)
})

const submitPasswordChange = () => {
  if(!token.value) {
    return;
  }

  const decodedToken = jose.decodeJwt(token.value);
  mutate({ token: token.value, email: decodedToken.sub, newPassword: password.value})
}
</script>

<template>
  <h1 class="text-center">Reset hesla</h1>
  <div class="flex flex-col items-center gap-y-6 w-full">

    <template v-if="isError">
      Chyba: {{ error!.message }}
    </template>

    <div class="flex flex-col items-center gap-y-6 w-full">
      <RevealablePasswordInput v-model="password">Heslo</RevealablePasswordInput>
      <RevealablePasswordInput v-model="passwordConfirm">Heslo znovu</RevealablePasswordInput>
      <button v-if="!(isPending || isSuccess)" class="secondary p-2 w-full" @click="submitPasswordChange" :disabled="!(passwordConfirm && passwordConfirm === password && token && isIdle)">
        Změnit heslo
      </button>
      <prefetch-link to="/" v-else-if="isSuccess" class="button-secondary p-2 w-full">Přejít domů</prefetch-link>
    </div>
  </div>
</template>
