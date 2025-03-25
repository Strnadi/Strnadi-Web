<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useMutation } from "@tanstack/vue-query";
import { postLogin } from "@/api/account";
import { accountStore } from "@/state/AccountStore";

import LogoNoText from "@/assets/logo-no-text.svg";

const router = useRouter();

const email = ref("");
const password = ref("");

const { mutate, isPending, error } = useMutation({
  mutationFn: (loginInfo: { email: string; password: string }) =>
    postLogin(loginInfo),
  onSuccess: (data) => {
    router.back();
    accountStore.login(data);
  },
});

const handleLogin = () => {
  mutate({ email: email.value, password: password.value });
};

const forgottenPassword = () => router.push("/ucet/zapomenute-heslo");
</script>

<template>
  <div class="flex flex-col items-center gap-y-6 w-full">
    <img :src="LogoNoText" />
    <h1 class="text-center">Nářečí českých strnadů</h1>
    <span class="text-xl text-center">Nahrávejte, mapujte, dobývejte</span>

    <div v-if="error">Chyba: {{ error }}</div>
    <div v-if="isPending">Načítání...</div>
    <div v-else class="flex flex-col items-center gap-y-6 w-full">
      <div
        class="flex flex-col items-center gap-y-2 w-[75%] max-lg:w-full"
      >
        <div class="flex flex-col gap-x-2 gap-y-4 w-full">
          <div>
            <label for="email" class="block text-sm font-medium mb-1">E-Mail</label>
            <input
              id="email"
              v-model="email"
              name="mail"
              type="email"
              placeholder="E-Mail"
              class="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label
              for="password"
              class="text-sm font-medium mb-1 flex flex-row justify-between"
            >
              <span>Heslo</span>
              <button @click="forgottenPassword">Zapomenuté heslo</button>
            </label>
            <input
              id="password"
              v-model="password"
              name="pass"
              type="password"
              placeholder="Heslo"
              class="w-full p-2 border rounded"
            />
          </div>
        </div>
        <button
          class="primary p-2 max-lg:w-full w-full"
          type="submit"
          :disabled="isPending"
          @click="handleLogin"
        >
          Přihlásit se
        </button>
      </div>
      <PrefetchLink
        class="button-secondary p-2 max-lg:w-full w-[75%] text-center"
        to="/ucet/registrace"
      >
        Založit účet
      </PrefetchLink>
    </div>
  </div>
</template>
