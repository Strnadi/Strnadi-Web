<route lang="yaml">
meta:
  layout: desktop/small-popup
</route>

<template>
  <h1>
    <TranslatedText identifier="account.delete.title" />
  </h1>
  <h2>
    <TranslatedText identifier="account.delete.prompt" />
  </h2>

  <div class="flex flex-row items-center gap-x-2">
    <input
      id="agreement"
      v-model="enabled"
      type="checkbox"
    >
    <label for="agreement">
      <span class="text-sm">
        <TranslatedText identifier="account.delete.confirmation_label" />
      </span>
    </label>
  </div>

  <button
    class="primary p-2"
    :disabled="!enabled"
    @click="() => mutate()"
  >
    <TranslatedText identifier="buttons.delete_account" />
  </button>
</template>

<script setup lang="ts">
import { deleteAccount } from '@/api/account';
import { accountStore } from '@/state/AccountStore';
import { useMutation } from '@tanstack/vue-query';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import TranslatedText from '@/components/TranslatedText.vue';

const enabled = ref(false);

const router = useRouter();

const { mutate } = useMutation({
  mutationKey: ['delete-account', accountStore.token],
  mutationFn: () => deleteAccount(accountStore.token!, accountStore.user!.id),
  onSuccess: () => {
    accountStore.logout();
    router.push('/');
  }
});
</script>
