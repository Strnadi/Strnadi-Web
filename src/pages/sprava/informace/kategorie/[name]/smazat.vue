<route>
meta:
  layout: desktop/small-popup
</route>

<script setup lang="ts">
import { useMutation } from '@tanstack/vue-query';
import { useRouteParams } from '@vueuse/router';
import { useRouter } from 'vue-router';
import { accountStore } from '@/state/AccountStore';
import { deleteArticleCategory } from '@/api/articles';

const router = useRouter();
const name = useRouteParams('name');

const { mutate: del } = useMutation({
  mutationFn: () => deleteArticleCategory(accountStore.token!, name.value),

  onSuccess() {
    router.back();
  }
})
</script>

<template>
  <h1>Smazání kategorie</h1>
  <span class="font-medium">Opravdu si přejete tuto kategorii smazat? Tuto akci nelze vrátit zpět.</span>

  <button @click="del" class="danger">
    Smazat
  </button>
</template>
