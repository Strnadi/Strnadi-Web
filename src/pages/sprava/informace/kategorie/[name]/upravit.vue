<route>
meta:
  layout: desktop/center
</route>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuery, useMutation } from '@tanstack/vue-query';
import { useRouteParams } from '@vueuse/router';
import { useRouter } from 'vue-router';
import { accountStore } from '@/state/AccountStore';
import { getArticle, patchArticle, deleteArticleFile, patchArticleFile } from '@/api/articles';

const { mutate: submitArticle } = useMutation({
  mutationFn: async () => {

  },

  onSuccess() {
    router.replace("/sprava/informace");
  }
})

</script>

<template>
  <h1>Úprava kategorie</h1>
  <input v-model="name" type="text" placeholder="Nadpis" />
  <input v-model="description" type="text" placeholder="Popisek" />

</template>
