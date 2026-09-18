<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { kebabize } from '@/utils/strings';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { accountStore } from '@/state/AccountStore';
import { getArticleCategories } from '@/api/articles';
import { getUserProjectIds } from '@/api/projects';

import Dropdown from '@/components/Dropdown.vue';
import AccountDropdown from '@/views/dropdown/account/AccountDropdown.vue';
import UploadProgress from '@/components/UploadProgress.vue';

import UploadIcon from '@/icons/interface/icon-upload.svg';
import DropdownIcon from '@/icons/interface/dropdown.svg';
import { applicationStore } from '@/state/ApplicationStore';
import { projectStore, selectProject } from '@/state/ProjectStore';
import TranslatedText from '@/components/TranslatedText.vue';
import { translations } from '@/constants/Translations';

const defaultProjectId = import.meta.env.VITE_PROJECT_ID;
const queryClient = useQueryClient();
const showAllProjects = ref(false);
const userId = computed(() => accountStore.user?.id ?? null);
const identityToken = computed(() => accountStore.identityToken);

const {
  data: memberProjectIds,
  isLoading: membershipsLoading,
  error: membershipsError
} = useQuery({
  queryKey: computed(() => ['member-projects', userId.value]),
  queryFn: () => getUserProjectIds(userId.value!, identityToken.value!),
  enabled: computed(() => !!userId.value && !!identityToken.value)
});

const memberProjectIdSet = computed(() => new Set(memberProjectIds.value ?? []));
const visibleProjects = computed(() =>
  !userId.value || showAllProjects.value
    ? projectStore.projects
    : projectStore.projects.filter((project) =>
        memberProjectIdSet.value.has(project.id)
      )
);

watch(userId, () => {
  showAllProjects.value = false;
});

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
      <div class="nav-glass flex justify-between gap-x-3 items-center h-16 rounded-4xl m-2 desktop:m-5 pr-4 whitespace-nowrap">
        <!-- Logo -->
        <div
          class="h-full flex flex-row items-center gap-1 pl-4 pr-2 font-semibold rounded-4xl bg-[#fdfcdc] border-[#fdfcdc] shrink-0">
          <RouterLink to="/vitejte" :title="projectStore.current.name">
            <img
              v-if="projectStore.current.id === defaultProjectId || projectStore.current.logoUrl"
              :src="projectStore.current.logoUrl || '/logo.svg'"
              :alt="projectStore.current.name"
              class="max-h-10 max-w-32 object-contain"
            />
            <span v-else class="block max-w-32 truncate text-sm">
              {{ projectStore.current.name }}
            </span>
          </RouterLink>
          <details class="project-switcher relative">
            <summary class="flex items-center justify-center rounded-xl p-2 cursor-pointer hover:bg-black/5"
              :aria-label="`Změnit projekt: ${projectStore.current.name}`"
              :title="projectStore.current.name">
              <DropdownIcon aria-hidden="true" />
            </summary>
            <ul class="absolute top-full left-0 z-[100] mt-3 min-w-64 max-w-96 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
              <li v-for="project in visibleProjects" :key="project.id" class="flex items-center gap-1">
                <button type="button" class="dropdown-item min-w-0 flex-1 text-left"
                  :class="{ 'font-bold': project.id === projectStore.current.id }"
                  :aria-current="project.id === projectStore.current.id ? 'true' : undefined"
                  @click="selectProject(project)">
                  <span class="truncate">{{ project.name }}</span>
                </button>
                <button v-if="userId && showAllProjects && memberProjectIds && !memberProjectIdSet.has(project.id)"
                  type="button" class="join-project-button rounded-lg px-2 py-1 text-xs font-semibold"
                  :aria-label="`Připojit se k projektu ${project.name}`"
                  title="Připojení k projektu zatím není dostupné">
                  Připojit se
                </button>
              </li>
              <li v-if="userId && membershipsLoading" class="px-3 py-2 text-sm text-gray-600" role="status">
                Načítání projektů…
              </li>
              <li v-if="userId && membershipsError" class="px-3 py-2 text-sm text-red-700" role="status">
                Projekty uživatele se nepodařilo načíst.
              </li>
              <li v-if="userId && !showAllProjects && memberProjectIds && !visibleProjects.length" class="px-3 py-2 text-sm text-gray-600" role="status">
                Zatím nemáte žádné projekty.
              </li>
              <li v-if="userId" class="mt-1 border-t border-gray-200 pt-1">
                <button type="button" class="dropdown-item w-full text-left text-sm"
                  @click="showAllProjects = !showAllProjects">
                  {{ showAllProjects ? 'Moje projekty' : 'Zobrazit všechny projekty' }}
                </button>
              </li>
              <li v-if="projectStore.error" class="px-3 py-2 text-sm text-red-700" role="status">
                {{ projectStore.error }}
              </li>
            </ul>
          </details>
        </div>

        <span v-if="isLoading">
          <TranslatedText identifier="loading" />...
        </span>

        <span v-if="error">
          Chyba při načítání obsahu: {{ error.message }}
        </span>

        <!-- Desktop navigation -->
        <div class="desktop-nav-items flex min-w-0 justify-between items-center w-full gap-x-3">
          <ul class="flex min-w-0 flex-row gap-x-3 items-center">
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

          <ul class="flex shrink-0 flex-row gap-x-3 items-center">
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

            <li>
              <RouterLink to="/aplikace" class="button-primary py-2 px-4">
                <TranslatedText identifier="buttons.app" />
              </RouterLink>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
@reference "../../styles/main.css";

:deep(.dropdown-item) {
  @apply whitespace-nowrap font-semibold flex flex-row items-center gap-x-1 px-3 py-2 hover:bg-gray-100 hover:border-0 rounded-xl;
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

.nav-glass :deep(a),
.nav-glass :deep(button) {
  white-space: nowrap;
  line-height: 1.1;
}

.project-switcher summary {
  list-style: none;
}

.project-switcher summary::-webkit-details-marker {
  display: none;
}

.join-project-button {
  border: 1px solid #e5e7eb;
  background: #fdfcdc;
}

@media (max-width: 78rem) {
  .desktop-nav-items {
    gap: 0.35rem;
    font-size: clamp(0.7rem, 1.3vw, 1rem);
  }

  :deep(.dropdown-item) {
    padding-inline: 0.45rem;
  }
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
