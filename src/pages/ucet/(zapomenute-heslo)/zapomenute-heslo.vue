<route>
meta:
  layout: desktop/small-popup
</route>

<script setup lang="ts">
import { getPasswordResetRequest } from "@/api/account";
import { useMutation } from "@tanstack/vue-query";
import { ref } from "vue";

const email = ref("");

const { mutate } = useMutation({
  mutationFn: ({ email }: { email: string }) => getPasswordResetRequest(email)
})

const submit = () => mutate({ email: email.value })
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
      <button class="secondary p-2 w-full" @click="submit">
        Odeslat kód
      </button>
    </div>
  </div>
</template>
