<route>
meta:
  layout: desktop/side
</route>

<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { getArticles } from '@/api/articles';

const { data: articles } = useQuery({
  queryKey: ["articles"],
  queryFn: () => getArticles()
})

</script>

<template>
  <h1>Informace</h1>

  <ul class="flex flex-col">
    <li v-for="article in articles">
      <router-link :to="`/informace/${article.id}`">
        {{ article.name }}
      </router-link>
    </li>
  </ul>
</template>
