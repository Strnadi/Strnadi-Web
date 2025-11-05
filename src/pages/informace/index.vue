<route lang="yaml">
meta:
  layout: desktop/side
</route>

<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { getArticleCategories } from '@/api/articles';

import { kebabize } from '@/utils/strings';
import TranslatedText from '@/components/TranslatedText.vue';

const { data: categories } = useQuery({
  queryKey: ['articles'],
  queryFn: () => getArticleCategories()
});
</script>

<template>
  <h1>
    <TranslatedText identifier="pages.information.title" />
  </h1>

  <ul class="flex flex-col">
    <li v-for="category in categories" :key="category.name">
      <h2>{{ category.label }}</h2>
      <ul class="flex flex-col">
        <li v-for="article in category.articles" :key="article.id">
          <router-link
            :to="`/informace/${category.name}/${kebabize(article.name)}`"
          >
            {{ article.name }}
          </router-link>
        </li>
      </ul>
    </li>
  </ul>
</template>
