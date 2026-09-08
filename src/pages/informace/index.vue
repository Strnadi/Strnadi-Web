<route lang="yaml">
meta:
  layout: desktop/side
</route>

<script setup vapor lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { getArticleCategories } from '@/api/articles';
import { kebabize } from '@/utils/strings';
import TranslatedText from '@/components/TranslatedText.vue';

const { data: categories, isLoading, error } = useQuery({
  queryKey: ['article-categories'],
  queryFn: () => getArticleCategories()
});
</script>

<template>
  <main class="information-page">
    <header class="information-hero">
      <span class="information-hero__eyebrow" aria-hidden="true">i</span>
      <div>
        <h1><TranslatedText identifier="pages.information.title" /></h1>
        <p><TranslatedText identifier="pages.information.description" /></p>
      </div>
    </header>

    <div v-if="isLoading" class="information-state" role="status">
      <span class="information-state__spinner" aria-hidden="true" />
      <TranslatedText identifier="states.loading" />
    </div>
    <div v-else-if="error" class="information-state information-state--error" role="alert">
      {{ error.message }}
    </div>
    <div v-else-if="!categories?.length" class="information-state">
      <TranslatedText identifier="empty" />
    </div>

    <div v-else class="information-categories">
      <section
        v-for="(category, categoryIndex) in categories"
        :key="category.name"
        class="information-category"
      >
        <header class="information-category__header">
          <span class="information-category__number" aria-hidden="true">
            {{ String(categoryIndex + 1).padStart(2, '0') }}
          </span>
          <div>
            <h2>{{ category.label }}</h2>
            <p>
              {{ (category.articles ?? []).length }}
              <TranslatedText identifier="pages.information.articles_count" />
            </p>
          </div>
        </header>

        <ul class="information-links">
          <li v-for="article in category.articles" :key="article.id">
            <RouterLink
              :to="`/informace/${category.name}/${kebabize(article.name)}`"
              class="information-link"
            >
              <span>{{ article.name }}</span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
            </RouterLink>
          </li>
        </ul>
      </section>
    </div>
  </main>
</template>

<style scoped>
.information-page { width: 100%; }
.information-hero { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
.information-hero h1 { margin: 0; font-size: clamp(2rem, 4vw, 3rem); font-weight: 800; letter-spacing: -0.04em; }
.information-hero p, .information-category__header p { margin: 0.25rem 0 0; color: var(--mobile-muted); }
.information-hero__eyebrow { display: grid; width: 3.25rem; height: 3.25rem; flex: 0 0 auto; place-items: center; border: 1px solid #e5b900; border-radius: 1rem; background: var(--mobile-yellow); color: var(--mobile-ink); font-family: Georgia, serif; font-size: 2rem; font-weight: 700; line-height: 1; box-shadow: 0 8px 20px rgba(129, 99, 0, 0.16); }
.information-categories { display: grid; gap: 1rem; }
.information-category { overflow: hidden; border: 1px solid var(--mobile-border); border-radius: var(--mobile-radius); background: var(--mobile-surface); box-shadow: 0 8px 24px rgba(62, 51, 20, 0.08); }
.information-category__header { display: flex; align-items: center; gap: 0.9rem; padding: 1rem; border-bottom: 1px solid var(--mobile-border); background: var(--mobile-cream); }
.information-category__header h2 { margin: 0; font-size: 1.15rem; font-weight: 750; }
.information-category__header p { font-size: 0.8rem; }
.information-category__number { color: #9a7900; font-size: 0.8rem; font-weight: 800; letter-spacing: 0.08em; }
.information-links { margin: 0; padding: 0; list-style: none; }
.information-links li + li { border-top: 1px solid var(--mobile-border); }
.information-link { display: flex; min-height: 3.75rem; align-items: center; gap: 0.75rem; padding: 0.8rem 1rem; color: var(--mobile-ink); font-weight: 650; text-decoration: none; transition: background-color 160ms ease, padding-left 160ms ease; }
.information-link span { min-width: 0; flex: 1; }
.information-link svg { width: 1.25rem; height: 1.25rem; flex: 0 0 auto; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2; }
.information-link:hover, .information-link:active { background: #fff5c8; }
.information-state { display: flex; min-height: 8rem; align-items: center; justify-content: center; gap: 0.75rem; padding: 1rem; border: 1px solid var(--mobile-border); border-radius: var(--mobile-radius); background: var(--mobile-surface); color: var(--mobile-muted); }
.information-state--error { border-color: #e8b5aa; background: #fff6f1; color: var(--mobile-danger); }
.information-state__spinner { width: 1.25rem; height: 1.25rem; border: 2px solid var(--mobile-border); border-top-color: var(--mobile-yellow-strong); border-radius: 999px; animation: information-spin 700ms linear infinite; }
@keyframes information-spin { to { transform: rotate(360deg); } }

@media (min-width: 60rem) {
  .information-categories { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .information-link:hover { padding-left: 1.2rem; }
}

@media (max-width: 59.999rem) {
  .information-hero { align-items: flex-start; margin-bottom: 1rem; }
  .information-hero__eyebrow { width: 2.75rem; height: 2.75rem; border-radius: 0.9rem; font-size: 1.65rem; }
  .information-hero h1 { font-size: 1.75rem; }
  .information-hero p { font-size: 0.9rem; line-height: 1.4; }
  .information-category, .information-state { box-shadow: none; }
}
</style>
