<script setup lang="ts">
import { ref, computed } from 'vue';
import { accountStore } from '@/state/AccountStore';

import { useQuery } from '@tanstack/vue-query';

import { getArticleCategories, type ArticleCategory, type Article } from '@/api/articles'

import Dropdown from '@/components/Dropdown.vue'
import AccountDropdown from '@/views/dropdown/account/AccountDropdown.vue';

import Upload from '@/icons/interface/icon-upload.svg';
import Notifications from '@/icons/interface/icon-notifications-empty.svg';
import List from '@/icons/interface/icon-list.svg';

import DropdownIcon from '@/icons/interface/dropdown.svg';
import MapIcon from '@/icons/interface/icon-map.svg';

import { kebabize } from '@/utils/strings';

const isMenuOpen = ref(false);

const { data: categories } = useQuery({
  queryKey: ["categories"],
  queryFn: async () => getArticleCategories()
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

      <!-- Desktop navigation -->
      <div class="hidden desktop:flex justify-between items-center w-full">
        <ul class="flex flex-row gap-x-4 items-center">
          <li>
            <PrefetchLink
              to="/"
              class="dropdown-item"
            >
              <MapIcon />
              Mapa
            </PrefetchLink>
          </li>

          <template v-if="accountStore.user">
            <li>
              <PrefetchLink
                to="/nahrat"
                class="dropdown-item"
              >
                <Upload />
                Nahrát
              </PrefetchLink>
            </li>
            <li>
              <PrefetchLink
                to="/ucet/sprava/moje-nahravky"
                class="dropdown-item"
              >
                <List />
                Moje záznamy
              </PrefetchLink>
            </li>
          </template>

          <Dropdown v-for="category in categories">
            <template
              #title
              class="flex flex-row items-center"
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
          <PrefetchLink
            to="/aplikace"
            class="button-primary py-2 px-4 max-sm:text-sm"
          >
            Stáhnout aplikaci
          </PrefetchLink>
          <li>
            <AccountDropdown v-if="accountStore.user" />
            <PrefetchLink
              v-else
              to="/ucet/vitejte"
              class="button-secondary py-2 px-4"
            >
              Přihlásit se
            </PrefetchLink>
          </li>
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
