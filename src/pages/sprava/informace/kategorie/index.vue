<script setup lang="ts">
import { getArticleCategories } from "@/api/articles";
import { useQuery } from "@tanstack/vue-query";

const { data: categories } = useQuery({
  queryKey: ["categories"],
  queryFn: () => getArticleCategories()
})

</script>

<template>
  <div class="flex flex-row items-center justify-between">
    <h2>Kategorie</h2>
    <router-link to="/sprava/informace/kategorie/nova" class="button-secondary px-2 py-1">Nová kategorie</router-link>
  </div>
  <ul class="flex flex-col">
    <li v-for="category in categories" class="flex flex-row justify-between gap-x-4">
      <div class="flex flex-row w-full justify-between">
        <span>{{ category.name }}</span>
        <span class="italic">{{ category.label }}</span>
      </div>
      <router-link :to="`/sprava/informace/kategorie/${category.name}/upravit`" class="font-bold">Upravit</router-link>
      <router-link :to="`/sprava/informace/kategorie/${category.name}/smazat`" class="button-danger">Smazat</router-link>
    </li>
  </ul>
</template>
