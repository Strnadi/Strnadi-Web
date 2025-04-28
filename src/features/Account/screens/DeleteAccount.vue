<template>
  <h1>Smazání účtu</h1>
  <h2>Opravdu si chcete smazat účet? Tuto akci nelze vrátit zpět.</h2>

  <div class="flex flex-row items-center gap-x-2">
    <input type="checkbox" id="agreement" v-model="enabled" />
    <label for="agreement">
      <span class="text-sm">Opravdu si chci smazat účet. Nahrávky zůstávají v databázi.</span>
    </label>
  </div>

  <button class="primary p-2" @click="() => mutate()" :disabled="!enabled">Smazat účet</button>
</template>

<script setup lang="ts">
import { deleteAccount } from '@/features/Account/api';
import { accountStore } from '@/features/Account/state/AccountStore';
import { useMutation } from '@tanstack/vue-query';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const enabled = ref(false);

const router = useRouter();

const { mutate } = useMutation({
  mutationKey: ['delete-account', accountStore.token],
  mutationFn: () => deleteAccount(accountStore.token!, accountStore.user!.email),
  onSuccess: () => {
    accountStore.logout();
    router.push('/');
  },
});
</script>
