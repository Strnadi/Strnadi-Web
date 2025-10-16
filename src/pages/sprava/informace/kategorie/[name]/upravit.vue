<route>
meta:
  layout: desktop/center
</route>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { useRouteParams } from '@vueuse/router';
import { getArticles, getArticleByCategory } from '@/api/articles';
import ListDeselect from '@/components/ListDeselect.vue';
import draggable from 'vuedraggable';

const name = useRouteParams<string>('name');

const { data: articles } = useQuery({
  queryKey: ["articles"],
  queryFn: () => getArticles()
});

const { data: currentCategory } = useQuery({
  queryKey: ["categories", name],
  queryFn: () => getArticleByCategory(name.value)
});

const categoryArticles = ref<typeof currentCategory.value>([]);
watch(currentCategory, (newVal) => {
  if (newVal) categoryArticles.value = [...newVal];
});

const newName = ref(name.value);
const description = ref("")

</script>

<template>
  <div class="flex flex-col w-full gap-y-2" @dragenter.prevent.stop>
    <h1>Úprava kategorie {{ newName }}</h1>
    <div class="w-full">
      <label
        for="title"
        class="block text-sm font-medium mb-1"
      >Nadpis kategorie</label>
      <input
        id="title"
        v-model="newName"
        type="text"
        placeholder="Nadpis"
        class="w-full p-2 border rounded"
      >
    </div>
    <div class="w-full">
      <label
        for="description"
        class="block text-sm font-medium mb-1"
      >Popis kategorie</label>
      <input
        id="description"
        v-model="description"
        type="text"
        placeholder="Popisek"
        class="w-full p-2 border rounded"
      >
    </div>

    <draggable
      v-if="categoryArticles"
      v-model="categoryArticles"
      item-key="id"
    >
      <template #item="{ element: article }">
        <div class="flex flex-row gap-x-2">
          <button>Smazat</button>
          <span>{{ article.name }} (ID: {{ article.id }})</span>
        </div>
      </template>

      <template #footer>
        <div>
          <v-select
            v-model="categoryArticles"
            :components="{ ListDeselect }"
            :options="articles"
            label="name"
            multiple
          />
        </div>
      </template>
    </draggable>

    <button class="primary p-2">
      Uložit
    </button>
  </div>
</template>
