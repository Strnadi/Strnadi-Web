<script setup lang="ts">
import { kebabize } from '@/utils/strings';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { accountStore } from '@/state/AccountStore';
import { getArticleCategories } from '@/api/articles';

import Dropdown from '@/components/Dropdown.vue';
import AccountDropdown from '@/views/dropdown/account/AccountDropdown.vue';
import UploadProgress from '@/components/UploadProgress.vue';

import UploadIcon from '@/icons/interface/icon-upload.svg';
import DropdownIcon from '@/icons/interface/dropdown.svg';
import { applicationStore } from '@/state/ApplicationStore';
import TranslatedText from '@/components/TranslatedText.vue';
import { translations } from '@/constants/Translations';

const queryClient = useQueryClient();

const {
  data: categories,
  isLoading,
  error
} = useQuery({
  queryKey: ['categories'],
  queryFn: getArticleCategories
});

const changeLanguage = (lang: keyof typeof translations) => {
  applicationStore.language = lang;

  queryClient.invalidateQueries({ queryKey: ['articles'] });
};
</script>

<template>
  <nav class="w-full">
    <div class="nav-container">
      <div class="nav-glass flex justify-between gap-x-4 items-center h-16 rounded-4xl m-2 desktop:m-5 pr-4">
        <!-- Logo -->
        <div
          class="h-full flex flex-row items-center p-4 font-semibold rounded-4xl bg-[#fdfcdc] border-[#fdfcdc] shrink-0">
          <RouterLink to="/vitejte">
            <img src="/logo.svg" alt="Logo" />
          </RouterLink>
        </div>

        <span v-if="isLoading">
          <TranslatedText identifier="loading" />...
        </span>

        <span v-if="error">
          Chyba při načítání obsahu: {{ error.message }}
        </span>

        <!-- Desktop navigation -->
        <div class="flex justify-between items-center w-full gap-x-4">
          <ul class="flex flex-row gap-x-4 items-center">
            <template v-if="accountStore.user">
              <li>
                <RouterLink to="/mapa/nahrat" class="dropdown-item">
                  <UploadIcon />
                  <TranslatedText identifier="upload.title" />
                </RouterLink>
              </li>
            </template>

            <Dropdown v-for="category in categories" :key="category.name">
              <template #title>
                {{ category.label }}
                <DropdownIcon />
              </template>

              <li v-for="article in category.articles" :key="article.id">
                <RouterLink :to="`/informace/${category.name}/${kebabize(article.name)}`"
                  class="dropdown-item flex! flex-col! items-start!">
                  <span>{{ article.name }}</span>
                  <span v-if="article.description" class="italic">
                    {{ article.description }}
                  </span>
                </RouterLink>
              </li>
            </Dropdown>
          </ul>

          <!-- Upload Progress (inline with nav items) -->
          <UploadProgress />

          <ul class="flex flex-row gap-x-4 items-center">
            <Dropdown>
              <template #title>
                <!--              {{ translations[applicationStore.language].lang_name }}-->
                {{ translations[applicationStore.language].lang_name }}
                <DropdownIcon />
              </template>

              <ul>
                <li v-for="key in Object.keys(
                  translations
                ) as (keyof typeof translations)[]" :key="key" class="dropdown-item">
                  <button :class="key === applicationStore.language ? 'font-bold' : ''
                    " @click="changeLanguage(key)">
                    {{ translations[key].lang_name }}
                  </button>
                </li>
              </ul>
            </Dropdown>

            <li>
              <AccountDropdown v-if="accountStore.user" />
              <RouterLink v-else to="/ucet/vitejte" class="button-secondary py-2 px-4">
                <TranslatedText identifier="buttons.login" />
              </RouterLink>
            </li>

            <RouterLink to="/aplikace" class="button-primary py-3 px-4 max-sm:text-sm">
              <TranslatedText identifier="buttons.app" />
            </RouterLink>
          </ul>
        </div>
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

.nav-container {
  @apply flex flex-col;
}

.nav-glass {
  @apply bg-white;
}

/* @supports (
  (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))
) {
  .nav-glass {
    background: linear-gradient(
      135deg,
      rgba(253, 252, 220, 0.82),
      rgba(255, 255, 255, 0.74)
    );
    backdrop-filter: blur(28px) saturate(140%);
    -webkit-backdrop-filter: blur(28px) saturate(140%);
  }
} */

/* @media (prefers-reduced-transparency: reduce) {
  .nav-glass {
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    background: #ffffff;
  }
} */
</style>
