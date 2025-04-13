<script setup lang="ts">
import { ref } from "vue";

const email = ref("");

</script>

<template>
  <div class="flex flex-col items-center gap-y-6 w-full">
    <img src="/logo-no-text.svg" />
    <h1 class="text-center">Zapomenuté heslo</h1>

    <div class="flex flex-col items-center gap-y-6 w-full">
      <div class="w-full flex flex-col gap-y-1">
        <label for="email" class="block text-sm font-medium">E-Mail</label>
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