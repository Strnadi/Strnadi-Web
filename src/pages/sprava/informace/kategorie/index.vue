<script setup lang="ts">
import { getArticleCategories } from '@/api/articles';
import { useQuery } from '@tanstack/vue-query';
import TranslatedText from '@/components/TranslatedText.vue';

const { data: categories } = useQuery({
  queryKey: ['categories'],
  queryFn: () => getArticleCategories()
});
</script>

<template>
  <div class="flex flex-row items-center justify-between">
    <h2>
      <TranslatedText identifier="admin.articles.categories_title" />
    </h2>
    <router-link
      to="/sprava/informace/kategorie/nova"
      class="button-secondary px-2 py-1"
    >
      <TranslatedText identifier="admin.articles.new_category" />
    </router-link>
  </div>
  <ul class="flex flex-col gap-y-2">
    <li
      v-for="category in categories"
      :key="category.name"
      class="flex flex-row justify-between gap-x-2"
    >
      <div class="flex flex-col w-full justify-between">
        <span>{{ category.label }}</span>
        <span class="italic">{{ category.name }}</span>
      </div>
      <router-link
        :to="`/sprava/informace/kategorie/${category.name}/upravit`"
        class="button-secondary m-auto p-2"
      >
        <TranslatedText identifier="buttons.edit" />
      </router-link>
      <router-link
        :to="`/sprava/informace/kategorie/${category.name}/smazat`"
        class="button-danger m-auto p-2"
      >
        <TranslatedText identifier="buttons.delete" />
      </router-link>
    </li>
  </ul>
</template>
