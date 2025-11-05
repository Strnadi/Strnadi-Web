<route lang="yaml">
meta:
  layout: desktop/small-popup
</route>

<script setup lang="ts">
import { useMutation } from '@tanstack/vue-query';
import { useRouteParams } from '@vueuse/router';
import { useRouter } from 'vue-router';
import { accountStore } from '@/state/AccountStore';
import { deleteArticle } from '@/api/articles';
import type { Numeric } from '@/types/basic';
import TranslatedText from '@/components/TranslatedText.vue';

const router = useRouter();
const id = useRouteParams<Numeric>('id');

const { mutate: mutateDeleteArticle } = useMutation({
  mutationFn: () => deleteArticle(accountStore.token!, id.value),

  onSuccess() {
    router.back();
  }
});

const handleDeleteArticle = () => {
  mutateDeleteArticle();
};
</script>

<template>
  <h1>
    <TranslatedText identifier="admin.articles.delete_post_title" />
  </h1>
  <span class="font-medium">
    <TranslatedText identifier="admin.articles.delete_post_prompt" />
    <span class="ml-1">
      <TranslatedText identifier="common.irreversible_action" />
    </span>
  </span>

  <button class="danger" @click="handleDeleteArticle">
    <TranslatedText identifier="buttons.delete" />
  </button>
</template>
