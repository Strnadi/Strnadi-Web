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
import LiquidGlass from '@/components/LiquidGlass.vue';

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
  <LiquidGlass
    class="navbar-glass"
    :resolution="1.25"
    :refraction="0.028"
    :aberration="0.009"
    :frost="1.8"
    :bevel-depth="0.11"
    :bevel-width="0.2"
    :magnify="1.012"
  >
    <nav aria-label="Hlavní navigace">
      <div class="nav-surface">
        <!-- Logo -->
        <div class="nav-logo">
          <RouterLink to="/vitejte">
            <img
              src="/logo.svg"
              alt="Logo"
            />
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
                <RouterLink
                  to="/mapa/nahrat"
                  class="dropdown-item"
                >
                  <UploadIcon />
                  <TranslatedText identifier="upload.title" />
                </RouterLink>
              </li>
            </template>

            <Dropdown
              v-for="category in categories"
              :key="category.name"
            >
              <template #title>
                {{ category.label }}
                <DropdownIcon />
              </template>

              <li
                v-for="article in category.articles"
                :key="article.id"
              >
                <RouterLink
                  :to="`/informace/${category.name}/${kebabize(article.name)}`"
                  class="dropdown-item flex! flex-col! items-start!"
                >
                  <span>{{ article.name }}</span>
                  <span
                    v-if="article.description"
                    class="italic"
                  >
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
                <li
                  v-for="key in Object.keys(
                    translations
                  ) as (keyof typeof translations)[]"
                  :key="key"
                  class="dropdown-item"
                >
                  <button
                    :class="
                      key === applicationStore.language ? 'font-bold' : ''
                    "
                    @click="changeLanguage(key)"
                  >
                    {{ translations[key].lang_name }}
                  </button>
                </li>
              </ul>
            </Dropdown>

            <li>
              <AccountDropdown v-if="accountStore.user" />
              <RouterLink
                v-else
                to="/ucet/vitejte"
                class="button-secondary py-2 px-4"
              >
                <TranslatedText identifier="buttons.login" />
              </RouterLink>
            </li>

            <li>
              <RouterLink
                to="/aplikace"
                class="button-primary py-2 px-4"
              >
                <TranslatedText identifier="buttons.app" />
              </RouterLink>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  </LiquidGlass>
</template>

<style scoped>
@reference "../../styles/main.css";

:deep(.dropdown-item) {
  @apply font-semibold flex flex-row items-center gap-x-1 px-5 py-2 hover:bg-gray-100 hover:border-0 rounded-xl;
}

nav {
  @apply h-full min-w-0 w-full;
}

.navbar-glass {
  @apply top-2 left-2 right-2 desktop:top-5 desktop:left-5 desktop:right-5 z-[9] h-16 rounded-4xl;
  background: rgba(255, 255, 255, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.62);
  box-shadow:
    0 14px 38px rgba(15, 23, 42, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.72),
    inset 0 -1px 0 rgba(255, 255, 255, 0.22);
}

.nav-surface {
  @apply relative flex h-full items-center justify-between gap-x-4 rounded-4xl pr-4;
  isolation: isolate;
}

.nav-surface::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  background: linear-gradient(
    115deg,
    rgba(255, 255, 255, 0.2),
    rgba(253, 252, 220, 0.08) 46%,
    rgba(255, 255, 255, 0.12)
  );
  pointer-events: none;
}

.nav-surface::after {
  content: '';
  position: absolute;
  inset: 1px 1.25rem auto;
  height: 1px;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.9),
    transparent
  );
  pointer-events: none;
}

.nav-logo {
  @apply relative ml-1 flex shrink-0 flex-row items-center rounded-4xl px-4 font-semibold;
  height: calc(100% - 0.5rem);
  background: linear-gradient(
    135deg,
    rgba(253, 252, 220, 0.8),
    rgba(255, 255, 255, 0.5)
  );
  border: 1px solid rgba(255, 255, 255, 0.7);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.82),
    0 4px 14px rgba(15, 23, 42, 0.08);
}

:deep(.dropdown-item:hover),
:deep(button:hover) {
  background-color: rgba(255, 255, 255, 0.48);
}

@media (prefers-reduced-transparency: reduce) {
  .navbar-glass {
    border-color: rgba(15, 23, 42, 0.08);
  }
}
</style>
