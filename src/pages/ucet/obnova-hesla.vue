<route lang="yaml">
meta:
  layout: desktop/small-popup
</route>

<script setup lang="ts">
import * as jose from 'jose';
import { patchPasswordChange } from '@/api/account';
import RevealablePasswordInput from '@/components/RevealablePasswordInput.vue';
import { useMutation } from '@tanstack/vue-query';
import { useRouteQuery } from '@vueuse/router';
import { computed, onMounted, ref } from 'vue';

const token = useRouteQuery("token");
const userId = useRouteQuery("userId");
const password = ref("");
const passwordConfirm = ref("");

const { mutate, isPending, isIdle, isSuccess, isError, error } = useMutation({
  mutationFn: ({ token, userId, newPassword }: {token: string, userId: string, newPassword: string}) => patchPasswordChange(token, userId, newPassword)
})

const submitPasswordChange = () => {
  if(!token.value || !userId.value) {
    console.error("Token or userId is missing");
    return;
  }

  const decodedToken = jose.decodeJwt(token.value as string);
  mutate({ token: token.value as string, userId: userId.value as string, newPassword: password.value})
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
