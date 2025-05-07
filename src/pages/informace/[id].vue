<route>
meta:
  layout: desktop/side
</route>

<script setup lang="ts">
import VueMarkdown from 'vue-markdown-render';
import { useQuery } from '@tanstack/vue-query';
import { useRouteParams } from '@vueuse/router'
import { computed } from 'vue';
import { changeImage, changeLinkTarget } from '@/plugins/markdown-it/image-base';
import { getArticleFile } from '@/api/articles';

const env = import.meta.env;

const id = useRouteParams('id');

const { data: markdown } = useQuery({
  queryKey: ["articles", id],
  queryFn: () => getArticleFile(id.value, "Text.md")
})

const plugins = computed(() => [
  changeImage(`${env.VITE_API_URL}/articles/${id.value}`),
  changeLinkTarget("_blank")
]);

const options = {
  html: true,
  linkify: true,
  typographer: true,
  quotes: "„“‚‘"
};

</script>

<template>
  <div class="max-w-full">
    <vue-markdown
      v-if="markdown"
      :source="markdown"
      :options="options"
      :plugins="plugins"
    />
  </div>
</template>
