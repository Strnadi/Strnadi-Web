<template>
  <div class="flex flex-col gap-y-4">
    <form class="flex flex-col gap-y-2">
      <input v-model="registerStore.email" name="email" type="email" placeholder="E-Mail" />
      <div class="flex flex-row items-center gap-x-2">
        <input type="checkbox" id="agreement" v-model="agreement" />
        <label for="agreement">
          <span class="text-sm">Zapojením do projektu občanské vědy Nářečí českých strnadů <PrefetchLink to="/podminky-pouziti" class="underline">souhlasím s podmínkami</PrefetchLink></span>
        </label>
      </div>
      <button class="primary p-2 m-2" :disabled="!agreement" @click="registerStore.nextStage">Pokračovat</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { registerStore } from "@/state/RegisterStore"; // Adjust the import based on your store structure

const agreement = ref(false);
</script>
