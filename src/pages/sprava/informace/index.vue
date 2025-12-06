<route lang="yaml">
meta:
  layout: desktop/center
</route>

<script setup lang="ts">
import { getArticleCategories, getArticles } from '@/api/articles';
import { useQuery } from '@tanstack/vue-query';
import { computed } from 'vue';
import TranslatedText from '@/components/TranslatedText.vue';
import DropdownIcon from '@/icons/interface/dropdown.svg';

const { data: categories } = useQuery({
  queryKey: ['categories'],
  queryFn: () => getArticleCategories()
});

const { data: allArticles } = useQuery({
  queryKey: ['articles'],
  queryFn: () => getArticles()
});

// Find articles that are not in any category
const uncategorizedArticles = computed(() => {
  if (!allArticles.value || !categories.value) return [];

  const categorizedArticleIds = new Set(
    categories.value.flatMap((cat) =>
      (cat.articles || []).map((article) => article.id)
    )
  );

  return allArticles.value.filter(
    (article) => article.id && !categorizedArticleIds.has(article.id)
  );
});
</script>

<template>
  <h1>
    <TranslatedText identifier="admin.articles.manage_title" />
  </h1>

  <div class="flex flex-col gap-y-4">
    <!-- Categories Management Header -->
    <div class="flex flex-row items-center justify-between">
      <router-link
        to="/sprava/informace/kategorie/nova"
        class="button-secondary px-2 py-1"
      >
        <TranslatedText identifier="admin.articles.new_category" />
      </router-link>
      <router-link
        to="/sprava/informace/prispevky/novy"
        class="button-secondary px-2 py-1 text-sm"
      >
        <TranslatedText identifier="admin.articles.new_article" />
      </router-link>
    </div>

    <!-- Accordion of Categories with Articles -->
    <div class="flex flex-col gap-y-3">
      <details
        v-for="category in categories"
        :key="category.name"
        class="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
      >
        <summary
          class="flex flex-row justify-between gap-x-2 p-3 cursor-pointer hover:bg-gray-50"
        >
          <div class="flex flex-row content-center items-center gap-x-2">
            <DropdownIcon class="w-[64px] h-[32px]" />
            <div class="flex flex-col w-full justify-between">
              <span class="font-semibold">{{ category.label }}</span>
              <span class="italic text-sm text-gray-600">{{
                category.name
              }}</span>
            </div>
          </div>
          <div class="flex flex-row gap-x-2 shrink-0">
            <router-link
              :to="`/sprava/informace/kategorie/${category.name}/upravit`"
              class="button-secondary m-auto p-2"
              @click.stop
            >
              <TranslatedText identifier="buttons.edit" />
            </router-link>
            <router-link
              :to="`/sprava/informace/kategorie/${category.name}/smazat`"
              class="button-danger m-auto p-2"
              @click.stop
            >
              <TranslatedText identifier="buttons.delete" />
            </router-link>
          </div>
        </summary>

        <!-- Articles within Category -->
        <div class="p-3 pt-0 border-t">
          <ul
            v-if="category.articles && category.articles.length > 0"
            class="flex flex-col gap-y-3"
          >
            <li
              v-for="article in category.articles"
              :key="article.id"
              class="flex flex-row justify-around gap-x-2 p-2 bg-gray-50 rounded"
            >
              <div class="flex flex-col w-full justify-around">
                <span>{{ article.name }}</span>
                <span v-if="article.description"><i>{{ article.description }}</i></span>
              </div>
              <div class="flex flex-row gap-x-2 shrink-0">
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
          <p
            v-else
            class="text-gray-500 italic"
          >
            <TranslatedText
              identifier="admin.articles.no_articles_in_category"
            />
          </p>
        </div>
      </details>

      <!-- Uncategorized Articles -->
      <details
        v-if="uncategorizedArticles.length > 0"
        class="bg-white rounded-lg shadow-sm border border-gray-200 border-dashed p-4"
      >
        <summary
          class="flex flex-row justify-between gap-x-2 p-3 cursor-pointer hover:bg-gray-50"
        >
          <div class="flex flex-col w-full justify-between">
            <span class="font-semibold">
              <TranslatedText identifier="admin.articles.uncategorized.title" />
            </span>
            <span class="italic text-sm text-gray-600">
              <TranslatedText
                identifier="admin.articles.uncategorized.description"
              />
            </span>
          </div>
        </summary>

        <!-- Uncategorized Articles List -->
        <div class="p-3 pt-0 border-t">
          <ul class="flex flex-col gap-y-3">
            <li
              v-for="article in uncategorizedArticles"
              :key="article.id"
              class="flex flex-row justify-around gap-x-2 p-2 bg-gray-50 rounded"
            >
              <div class="flex flex-col w-full justify-around">
                <span>{{ article.name }}</span>
                <span v-if="article.description"><i>{{ article.description }}</i></span>
              </div>
              <div class="flex flex-row gap-x-2 shrink-0">
                <router-link
                  :to="`/sprava/informace/prispevky/${article.id}/upravit`"
                  class="button-secondary m-auto p-2"
                >
                  <TranslatedText identifier="buttons.edit" />
                </router-link>
                <router-link
                  :to="`/sprava/informace/prispevky/${article.id}/smazat`"
                  class="button-danger m-auto p-2"
                >
                  <TranslatedText identifier="buttons.delete" />
                </router-link>
              </div>
            </li>
          </ul>
        </div>
      </details>
    </div>
  </div>
</template>
