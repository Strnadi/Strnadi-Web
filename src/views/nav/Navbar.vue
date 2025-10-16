<script setup lang="ts">
import { kebabize } from '@/utils/strings';
import { useQuery } from '@tanstack/vue-query';
import { accountStore } from '@/state/AccountStore';
import { getArticleCategories } from '@/api/articles'

import Dropdown from '@/components/Dropdown.vue'
import AccountDropdown from '@/views/dropdown/account/AccountDropdown.vue';

import UploadIcon from '@/icons/interface/icon-upload.svg';
import DropdownIcon from '@/icons/interface/dropdown.svg';
import { applicationStore } from '@/state/ApplicationStore';
import TranslatedText from '@/components/TranslatedText.vue';
import { translations } from '@/constants/Translations';

const { data: categories, isLoading, error } = useQuery({
  queryKey: ["categories"],
  queryFn: getArticleCategories
})

</script>

<template>
  <nav class="w-full">
    <div class="flex justify-between gap-x-4 items-center h-16 bg-white rounded-4xl m-2 desktop:m-5 pr-4">
      <!-- Logo -->
      <div class="h-full flex flex-row items-center p-4 font-semibold rounded-4xl bg-[#fdfcdc] border-[#fdfcdc] shrink-0">
        <PrefetchLink to="/vitejte">
          <img
            src="/logo.svg"
            alt="Logo"
          >
        </PrefetchLink>
      </div>

      <span v-if="isLoading">
        <TranslatedText identifier="loading" />...
      </span>

      <span v-if="error">
        Chyba při načítání obsahu: {{ error.message }}
      </span>

      <!-- Desktop navigation -->
      <div class="flex justify-between items-center w-full">
        <ul class="flex flex-row gap-x-4 items-center">
          <template v-if="accountStore.user">
            <li>
              <PrefetchLink
                to="/mapa/nahrat"
                class="dropdown-item"
                v-wave
              >
                <UploadIcon />
                Nahrát
              </PrefetchLink>
            </li>
          </template>

          <Dropdown
            v-for="category in categories"
            :key="category.name"
          >
            <template
              #title
            >
              {{ category.label }}
              <DropdownIcon />
            </template>

            <li
              v-for="article in category.articles"
              :key="article.id"
            >
              <prefetch-link
                :to="`/informace/${category.name}/${kebabize(article.name)}`"
                class="dropdown-item !flex !flex-col !items-start"
                v-wave
              >
                <span>{{ article.name }}</span>
                <span
                  v-if="article.description"
                  class="italic"
                >
                  {{ article.description }}
                </span>
              </prefetch-link>
            </li>
          </Dropdown>
        </ul>

        <ul class="flex flex-row gap-x-4 items-center">
          <Dropdown>
            <template #title>
<!--              {{ translations[applicationStore.language].lang_name }}-->
              {{ translations[applicationStore.language].lang_name }}
              <DropdownIcon />
            </template>

            <ul>
              <li
                v-for="key in (Object.keys(translations) as (keyof typeof translations)[])"
                :key="key"
                class="dropdown-item"
                v-wave
              >
                <button
                    :class="key === applicationStore.language ? 'font-bold' : ''"
                    @click="() => applicationStore.language = key"
                >{{ translations[key].lang_name }}</button>
              </li>
            </ul>

          </Dropdown>

          <li>
            <AccountDropdown v-if="accountStore.user" />
            <PrefetchLink
              v-else
              to="/ucet/vitejte"
              class="button-secondary py-2 px-4"
            >
              <TranslatedText identifier="buttons.login" />
            </PrefetchLink>
          </li>

          <PrefetchLink
              to="/aplikace"
              class="button-primary py-2 px-4 max-sm:text-sm"
          >
            <TranslatedText identifier="buttons.app" />
          </PrefetchLink>
        </ul>
      </div>
    </div>
  </nav>
</template>

<style scoped>

@reference "../../styles/main.css";

:deep(.dropdown-item) {
  @apply font-semibold flex flex-row items-center gap-x-1 px-5 py-2 hover:bg-gray-100 hover:border-0 rounded-xl;
}

nav {
  @apply fixed z-[9] drop-shadow-xl min-w-0 w-full;
}

</style>
