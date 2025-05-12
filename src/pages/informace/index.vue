<route>
meta:
  layout: desktop/side
</route>

<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { getArticleCategories } from '@/api/articles';

const { data: categories } = useQuery({
  queryKey: ["articles"],
  queryFn: () => getArticleCategories()
})

</script>

<template>
  <h1>Informace</h1>

  <ul class="flex flex-row flex-wrap">
    <li v-for="category in categories">
      <h2>{{ category.label }}</h2>
      <ul class="flex flex-col">
        <li v-for="article in category.articles">
          <router-link :to="`/informace/${article.id}`">
            {{ article.name }}
          </router-link>
        </li>
      </ul>
    </li>
  </ul>
</template>
