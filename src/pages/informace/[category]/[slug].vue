<route lang="yaml">
meta:
  layout: desktop/side
  landing-bypass: true
</route>

<script setup lang="ts">
import VueMarkdown from 'vue-markdown-render';
import { useQuery } from '@tanstack/vue-query';
import { useRouteParams } from '@vueuse/router';
import { computed } from 'vue';
import { changeImage } from '@/plugins/markdown-it/images';
import { changeLink } from '@/plugins/markdown-it/links';
import { getArticleByCategory, getArticleFile } from '@/api/articles';
import { kebabize } from '@/utils/strings';

const env = import.meta.env;

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
  queryKey: ['articles', category, slug],
  queryFn: () => {
    return getArticleFile(id.value, 'Text.md');
  },
  enabled: computed(() => !!id.value)
});

const fileBase = computed(() => `${env.VITE_API_URL}/articles/${id.value}`);

const plugins = computed(() => [
  changeImage(fileBase.value),
  changeLink('_blank', fileBase.value)
]);

const options = {
  html: true,
  linkify: true,
  typographer: true,
  quotes: '„“‚‘'
};
</script>

<template>
  <div class="max-w-full pb-16">
    <vue-markdown
      v-if="markdown"
      :source="markdown"
      :options="options"
      :plugins="plugins"
    />
  </div>
</template>
