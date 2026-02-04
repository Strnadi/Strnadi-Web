<route lang="yaml">
meta:
  layout: desktop/small-popup
</route>

<script setup vapor lang="ts">
import { useMutation } from '@tanstack/vue-query';
import { useRouteParams } from '@vueuse/router';
import { useRouter } from 'vue-router';
import { accountStore } from '@/state/AccountStore';
import { deleteArticleCategory } from '@/api/articles';
import TranslatedText from '@/components/TranslatedText.vue';

const router = useRouter();
const name = useRouteParams<string>('name');

const { mutate: deleteCategory } = useMutation({
  mutationFn: () => deleteArticleCategory(accountStore.token!, name.value),

  onSuccess() {
    router.back();
  }
});

const handleDeleteCategory = () => {
  deleteCategory();
};
</script>

<template>
  <h1>
    <TranslatedText identifier="admin.articles.delete_category_title" />
    {{ name }}
  </h1>
  <button
    class="danger"
    @click="handleDeleteCategory"
  >
    <TranslatedText identifier="buttons.delete" />
  </button>
</template>
