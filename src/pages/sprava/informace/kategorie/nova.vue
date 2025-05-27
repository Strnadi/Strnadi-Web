<route>
meta:
  layout: desktop/center
</route>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuery, useMutation } from '@tanstack/vue-query';
import { getArticles, postArticleCategory, patchAssignArticleCategory, type Article } from '@/api/articles';
import { accountStore } from '@/state/AccountStore';
import { useRouter } from 'vue-router';
 import ListDeselect from '@/components/ListDeselect.vue';

const router = useRouter();

const name = ref("");
const label = ref("");

// Id's
const categoryArticles = ref<number[]>([]);

const { data: articles } = useQuery({
  queryKey: ['articles'],
  queryFn: () => getArticles(),
});

// const categories = useQuery({ queryKey: ['articleCategories'], queryFn: getArticleCategories });

const { mutate: submitCategory } = useMutation({
  mutationFn: async () => {
    await postArticleCategory(accountStore.token!, {
      name: name.value,
      label: label.value
    });

    for (let index = 0; index < categoryArticles.value.length; index++) {
      const articleId = categoryArticles.value[index];
      patchAssignArticleCategory(accountStore.token!, name.value, {
        articleId,
        order: index
      });
    }
  },

  onSuccess() {
    router.replace("/sprava/informace");
  }
})

</script>

<template>
  <h1>Nová kategorie</h1>
  <input
    v-model="name"
    type="text"
    placeholder="Název"
  >
  <input
    v-model="label"
    type="text"
    placeholder="Popis"
  >


  <div>
    <h2>Zahrnuté příspěvky</h2>
    <v-select
      v-model="categoryArticles"
      :options="articles"
      :reduce="(article: Article) => article.id"
      :components="{ ListDeselect }"
      label="name"
      multiple
    />
  </div>

  <button @click="submitCategory">
    Přidat
  </button>
</template>
