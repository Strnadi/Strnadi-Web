<route lang="yaml">
meta:
  layout: desktop/side
  landing-bypass: true
</route>

<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { useRouteParams } from '@vueuse/router';
import { computed, ref } from 'vue';
import { getArticleByCategory, getArticleFile } from '@/api/articles';
import { kebabize } from '@/utils/strings';
import { applicationStore } from '@/state/ApplicationStore';

import { MdPreview } from 'md-editor-v3';
import 'md-editor-v3/lib/preview.css';

const env = import.meta.env;

const category = useRouteParams<string>('category');
const slug = useRouteParams<string>('slug');

const { data: articles, isLoading: articlesLoading, error: articlesError } = useQuery({
  queryKey: ['articles', 'category', category],
  queryFn: () => getArticleByCategory(category.value)
});

const id = computed(
  () =>
    articles.value?.find((article) => kebabize(article.name) === slug.value)
      ?.id!
);

const { data: markdown, isLoading: markdownLoading, error: markdownError } = useQuery({
  queryKey: ['articles', 'content', id, applicationStore.language],
  queryFn: async () => {
    try {
      return await getArticleFile(
        id.value,
        applicationStore.language + '.md'
      );
    } catch (error) {
      if (applicationStore.language === 'cs-CZ') throw error;
      return getArticleFile(id.value, 'cs-CZ.md');
    }
  },
  enabled: computed(() => !!id.value)
});

const fileBase = computed(() => `${env.VITE_API_URL}/articles/${id.value}`);

const resolvedMarkdown = computed(() =>
  String(markdown.value ?? '').replace(
    /(!?\[[^\]]*\]\()(?![a-z][a-z\d+.-]*:|\/|#)([^)]+)(\))/gi,
    (_match, prefix: string, path: string, suffix: string) =>
      `${prefix}${fileBase.value}/${path}${suffix}`
  )
);


const scrollElement = ref<HTMLElement | null>(null);
</script>

<template>
  <!-- <div class="max-w-full pb-16"> -->

  <div class="flex flex-col max-w-full" ref="scrollElement">
    <p v-if="articlesLoading || markdownLoading" role="status">Načítání…</p>
    <p v-else-if="articlesError || markdownError" role="alert" class="text-red-700">
      Obsah se nepodařilo načíst.
    </p>
    <p v-else-if="!id || !resolvedMarkdown" role="status">Obsah nebyl nalezen.</p>
    <MdPreview v-else :id="slug" :modelValue="resolvedMarkdown" />
    <!-- <MdCatalog :editorId="slug" :scroll-element="scrollElement" /> -->
  </div>

  <!-- </div> -->
</template>

<style scoped>
:deep(.md-preview),
:deep(.md-preview *),
:deep(.md-editor),
:deep(.md-editor *),
:deep(.md-editor-preview),
:deep(.md-editor-preview *) {
  font-family: 'Bricolage Grotesque', Arial, Helvetica, sans-serif;
  white-space: normal !important;
  overflow-wrap: normal !important;
  word-break: normal !important;
  text-align: justify;
}

:deep(.md-editor-preview h1),
:deep(.md-editor-preview h2),
:deep(.md-editor-preview h3),
:deep(.md-editor-preview h4),
:deep(.md-editor-preview h5),
:deep(.md-editor-preview h6) {
  margin: 0;
}
</style>
