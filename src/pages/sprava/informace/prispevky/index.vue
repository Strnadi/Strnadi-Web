<script setup lang="ts">
import { getArticles } from "@/api/articles";
import { useQuery } from "@tanstack/vue-query";

const { data: articles } = useQuery({
  queryKey: ["articles"],
  queryFn: () => getArticles()
})

</script>

<template>
  <div class="flex flex-row items-center justify-between">
    <h2>Příspěvky</h2>
    <router-link to="/sprava/informace/prispevky/novy" class="button-secondary px-2 py-1">Nový příspěvek</router-link>
  </div>
  <ul class="flex flex-col">
    <li v-for="article in articles" class="flex flex-row justify-around gap-x-4">
      <div class="flex flex-row w-full justify-between">
        <span>{{ article.name }}</span>
        <span>{{ article.description }}</span>
      </div>
      <router-link :to="`/sprava/informace/prispevky/${article.id}/upravit`" class="font-bold">Upravit</router-link>
      <router-link :to="`/sprava/informace/prispevky/${article.id}/smazat`" class="button-danger">Smazat</router-link>
    </li>
  </ul>
</template>
