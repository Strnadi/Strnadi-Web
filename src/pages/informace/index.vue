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
  <h1 class="text-2xl sm:text-3xl font-bold mb-6">
    <TranslatedText identifier="pages.information.title" />
  </h1>

  <div class="flex flex-col gap-6">
    <section
      v-for="category in categories"
      :key="category.name"
      class="border border-gray-200 rounded-lg p-4 sm:p-6"
    >
      <h2 class="text-xl sm:text-2xl font-semibold mb-4">
        {{ category.label }}
      </h2>
      <ul class="flex flex-col gap-2">
        <li
          v-for="article in category.articles"
          :key="article.id"
        >
          <router-link
            v-wave
            :to="`/informace/${category.name}/${kebabize(article.name)}`"
            class="block px-4 py-3 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-lg border border-gray-200 transition-colors min-h-[44px] flex items-center text-base sm:text-lg touch-manipulation"
          >
            {{ article.name }}
          </router-link>
        </li>
      </ul>
    </section>
  </div>
</template>
