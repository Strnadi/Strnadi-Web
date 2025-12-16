<route lang="yaml">
meta:
  layout: desktop/side
  landing-bypass: true
</route>

<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { useRouteParams } from '@vueuse/router';
import { computed, ref, watch } from 'vue';
import { getArticleByCategory, getArticleFile } from '@/api/articles';
import { kebabize } from '@/utils/strings';
import { applicationStore } from '@/state/ApplicationStore';
import { Head } from '@unhead/vue/components';

import { MdPreview, MdCatalog } from 'md-editor-v3';
import 'md-editor-v3/lib/preview.css';

const env = process.env;

const category = useRouteParams<string>('category');
const slug = useRouteParams<string>('slug');

const { data: articles } = useQuery({
  queryKey: ['articles', category],
  queryFn: () => getArticleByCategory(category.value)
});

const id = computed(
  () =>
    articles.value?.find((article) => kebabize(article.name) === slug.value)
      ?.id!
);

const { data: markdown } = useQuery({
  queryKey: ['articles', category, slug, applicationStore.language],
  queryFn: () => {
    return getArticleFile(id.value, applicationStore.language + '.md');
  },
  enabled: computed(() => !!id.value)
});

const fileBase = computed(() => `${env.PUBLIC_API_URL}/articles/${id.value}`);


const scrollElement = ref<HTMLElement | null>(null);
</script>

<template>
  <!-- <div class="max-w-full pb-16"> -->

  <Head>
    <base :href="fileBase + '/'" />
  </Head>

  <div class="flex flex-col max-w-full" ref="scrollElement">
    <MdPreview :id="slug" :modelValue="markdown" />
    <!-- <MdCatalog :editorId="slug" :scroll-element="scrollElement" /> -->
  </div>

  <!-- </div> -->
</template>

<style scoped>
.md-editor {
  font-family: 'Bricolage Grotesque', Arial, Helvetica, sans-serif;
}
</style>