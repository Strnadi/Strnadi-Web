<route>
meta:
  layout: desktop/center
</route>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuery, useMutation } from '@tanstack/vue-query';
import { getArticles, getArticleCategories, postArticleCategory, patchArticleCategory } from '@/api/articles';
import { accountStore } from '@/state/AccountStore';
import { useRouter } from 'vue-router';

const router = useRouter();

const name = ref("");
const label = ref("");

// Id's
const categoryArticles = ref<string[]>([]);

const { data: articles } = useQuery({
  queryKey: ['articles'],
  queryFn: () => getArticles(),
});

const { data: categories } = useQuery({
  queryKey: ['categories'],
  queryFn: () => getArticleCategories(),
});

const { mutate: submitCategory } = useMutation({
  mutationFn: async () => {
    await postArticleCategory(accountStore.token!, {
      name: name.value,
      label: label.value
    });

    for (let index = 0; index < categoryArticles.value.length; index++) {
      const article = categoryArticles.value[index];
      patchArticleCategory(accountStore.token!, name.value, {
        articleId: article.id,
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
  <input v-model="name" type="text" placeholder="Název" />
  <input v-model="label" type="text" placeholder="Popis" />

  <h2>Zahrnuté příspěvky</h2>

  <label for="articleAdd">Přidat příspěvek</label>
  <select name="articleAdd" @change="event => categoryArticles.push((event.target as HTMLSelectElement).value)">
    <optgroup v-for="category in categories" :label="category.name">
      <option
        v-for="article in category.articles"
        v-if="!categoryArticles.includes(article.id)"
        :key="article.id"
        :value="article.id"
      >
        {{ article.name }} - {{ article.description }}
      </option>
    </optgroup>
  </select>

  <ul>
    <li v-for="article in categoryArticles">
      {{ articles?.find(originalArticle => originalArticle.id == article)?.name }}
    </li>
  </ul>

  <button @click="submitCategory">
    Přidat
  </button>
</template>
