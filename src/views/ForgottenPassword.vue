<script setup lang="ts">
import LogoNoText from "@/assets/logo-no-text.svg";
import { ref } from "vue";

const email = ref("");

</script>

<template>
  <div class="flex flex-col items-center gap-y-6 w-full">
    <img :src="LogoNoText" />
    <h1 class="text-center">Nářečí českých strnadů</h1>
    <span class="text-xl text-center">Nahrávejte, mapujte, dobývejte</span>

    <div v-if="error">Chyba: {{ error }}</div>
    <div v-if="isPending">Načítání...</div>
    <div v-else class="flex flex-col items-center gap-y-6 w-full">
      <div>
        <label for="email" class="block text-sm font-medium mb-1">E-Mail</label>
        <input
          v-model="email"
          id="email"
          type="email"
          placeholder="E-Mail"
        />
      </div>
      <button class="secondary p-2 w-full">
        Odeslat kód
      </button>
    </div>
  </div>
</template>