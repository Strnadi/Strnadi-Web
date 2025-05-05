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

const router = useRouter();
const id = useRouteParams('id');

const { mutate: del } = useMutation({
  mutationFn: () => deleteArticle(accountStore.token!, id.value),

  onSuccess() {
    router.back();
  }
})
</script>

<template>
  <h1>Smazání příspěvku</h1>
  <span class="font-medium">Opravdu si přejete tento příspěvek smazat? Tuto akci nelze vrátit zpět.</span>

  <button @click="del" class="danger">
    Smazat
  </button>
</template>
