<route>
meta:
  layout: desktop/side
</route>

<script setup lang="ts">
import VueMarkdown from 'vue-markdown-render';
import { useQuery } from '@tanstack/vue-query';
import { useRouteParams } from '@vueuse/router'
import { computed } from 'vue';
import { changeImage } from '@/plugins/markdown-it/images';
import { changeLink } from '@/plugins/markdown-it/links';
import { getArticleFile } from '@/api/articles';

const env = import.meta.env;

const id = useRouteParams('id');

const { data: markdown } = useQuery({
  queryKey: ["articles", id],
  queryFn: () => getArticleFile(id.value, "Text.md")
})

const fileBase = computed(() => `${env.VITE_API_URL}/articles/${id.value}`);

const plugins = computed(() => [
  changeImage(fileBase.value),
  changeLink("_blank", fileBase.value)
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
