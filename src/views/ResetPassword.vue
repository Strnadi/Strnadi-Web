<script setup lang="ts">
import RevealablePasswordInput from '@/components/generic/RevealablePasswordInput.vue';
import { useRouteQuery } from '@vueuse/router';
import { ref } from 'vue';

const token = useRouteQuery("token");

const password = ref("");
const passwordConfirm = ref("");

const submitPasswordChange = () => {
  if(!token.value) {
    return;
  }


}
</script>

<template>
  <h1 class="text-center">Reset hesla</h1>
  <div class="flex flex-col items-center gap-y-6 w-full">

    <div class="flex flex-col items-center gap-y-6 w-full">
      <RevealablePasswordInput label="Heslo" v-model="password" />
      <RevealablePasswordInput label="Heslo znovu" v-model="passwordConfirm" />
      <button class="secondary p-2 w-full" @click="submitPasswordChange" :disabled="!(password === passwordConfirm && token)">
        Změnit heslo
      </button>
    </div>
  </div>
</template>
