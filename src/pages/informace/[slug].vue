<route lang="yaml">
meta:
  layout: desktop/side
</route>

<script setup lang="ts">
import VueMarkdown from 'vue-markdown-render';
import { useQuery } from '@tanstack/vue-query';
import { useRoute, onBeforeRouteUpdate } from 'vue-router'
import { computed } from 'vue';

const route = useRoute()
const slug = computed(() => route.params.slug);

const { data: article } = useQuery({
  queryKey: ["articles", slug],
  // queryFn: async () => get
});


</script>

<template>
  <vue-markdown :source="markdown" />
</template>
