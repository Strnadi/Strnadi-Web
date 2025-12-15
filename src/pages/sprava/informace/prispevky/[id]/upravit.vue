<route lang="yaml">
meta:
  layout: desktop/center
</route>

<script setup vapor lang="ts">
import { useRouteParams } from '@vueuse/router';
import ArticleEditor from '@/views/articles/ArticleEditor.vue';
import type { Numeric } from '@/types/basic';

const id = useRouteParams<Numeric>('id');
</script>

<template>
  <ArticleEditor
    mode="edit"
    :article-id="id"
  />
</template>
