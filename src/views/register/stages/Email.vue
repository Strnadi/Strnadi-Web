<template>
  <div class="flex flex-col">
    <form class="flex flex-col" @submit.prevent="handleRegister">
      <input v-model="email" name="email" type="email" placeholder="E-Mail" />
      <button class="primary p-2 m-2" type="submit">Pokračovat</button>
    </form>
    <button class="secondary" @click="navigateToLogin">
      Máte již účet? Přihlašte se.
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { registerStore } from "@/state/RegisterStore"; // Adjust the import based on your store structure

const router = useRouter();
const email = ref("");

function handleRegister() {
  registerStore.setEmail(email.value);
  registerStore.nextStage();
}

function navigateToLogin() {
  router.push("/auth/login");
}
</script>
