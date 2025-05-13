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
import { getArticles, getArticleByCategory, type Article } from '@/api/articles';
import ListDeselect from '@/components/ListDeselect.vue';

import draggable from 'vuedraggable';

const name = useRouteParams<string>('name');

const { data: articles } = useQuery({
  queryKey: ["articles"],
  queryFn: () => getArticles()
})

const { data: currentCategory } = useQuery({
  queryKey: ["categories", name],
  queryFn: () => getArticleByCategory(name.value)
})

const newName = ref(name.value);
const cateoryArticles = ref(currentCategory.value);
const description = ref("")

const art = ref([
  {
    "id": 10,
    "name": "Testovací příspěvek",
    "description": "Popis",
    "files": [
      {
        "id": 6,
        "articleId": 10,
        "fileName": "Text.md"
      },
      {
        "id": 7,
        "articleId": 10,
        "fileName": "vrana.jpg"
      }
    ],
    "categories": [
      {
        "id": 1,
        "label": "Základní informace",
        "name": "basic-info",
        "articles": null
      }
    ]
  }
]);

</script>

<template>
  <h1>Úprava kategorie {{ name }}</h1>
  <input
    v-model="name"
    type="text"
    placeholder="Nadpis"
  >
  <input
    v-model="description"
    type="text"
    placeholder="Popisek"
  >

  <draggable
    v-model="art"
    item-key="id"
  >
    <template #item="{ element: article }">
      <div> {{ article.name }} </div>
    </template>
    <template #footer>
      <div>
        <v-select
          v-model="categoryArticles"
          :components="{ ListDeselect }"
          :options="articles"
          label="title"
          multiple
        />
      </div>
    </template>
  </draggable>

  <button class="primary">
    Uložit
  </button>
</template>
