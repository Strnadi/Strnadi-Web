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
    <router-link
      to="/sprava/informace/prispevky/novy"
      class="button-secondary px-2 py-1"
    >
      Nový příspěvek
    </router-link>
  </div>
  <ul class="flex flex-col gap-y-3">
    <li
      v-for="article in articles"
      :key="article.id"
      class="flex flex-row justify-around gap-x-2"
    >
      <div class="flex flex-col w-full justify-around">
        <span>{{ article.name }}</span>
        <span v-if="article.description"><i>{{ article.description }}</i></span>
      </div>
      <div class="flex flex-row">
        <router-link
          :to="`/sprava/informace/prispevky/${article.id}/upravit`"
          class="button-secondary m-auto p-2"
        >
          Upravit
        </router-link>
        <router-link
          :to="`/sprava/informace/prispevky/${article.id}/smazat`"
          class="button-danger m-auto p-2"
        >
          Smazat
        </router-link>
      </div>
    </li>
  </ul>
</template>
