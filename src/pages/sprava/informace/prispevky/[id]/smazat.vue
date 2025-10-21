<route lang="yaml">
meta:
  layout: desktop/small-popup
</route>

<script setup lang="ts">
import { useMutation } from '@tanstack/vue-query';
import { useRouteParams } from '@vueuse/router';
import { useRouter } from 'vue-router';
import { accountStore } from '@/state/AccountStore';
import { deleteArticle } from '@/api/articles';
import type { Numeric } from '@/types/basic';

const router = useRouter();
const id = useRouteParams<Numeric>('id');

const { mutate: mutateDeleteArticle } = useMutation({
  mutationFn: () => deleteArticle(accountStore.token!, id.value),

  onSuccess() {
    router.back();
  }
});

const handleDeleteArticle = () => {
  mutateDeleteArticle();
};
</script>

<template>
  <h1>Smazání příspěvku</h1>
  <span class="font-medium"
    >Opravdu si přejete tento příspěvek smazat? Tuto akci nelze vrátit
    zpět.</span
  >

  <button class="danger" @click="handleDeleteArticle">Smazat</button>
</template>
