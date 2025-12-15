<route lang="yaml">
meta:
  layout: desktop/center
</route>

<script setup lang="ts">
import { ref } from 'vue';
import { useMutation } from '@tanstack/vue-query';
import {
  postArticleCategory,
  patchAssignArticleCategory,
  type Article
} from '@/api/articles';
import { accountStore } from '@/state/AccountStore';
import { useRouter } from 'vue-router';
import CategoryEditorForm from '@/views/CategoryEditorForm.vue';

const router = useRouter();

const name = ref('');
const label = ref('');
const selectedArticles = ref<Article[]>([]);

const { mutate: submitCategory, isPending } = useMutation({
  mutationFn: async () => {
    await postArticleCategory(accountStore.token!, {
      name: name.value,
      label: label.value
    });

    await Promise.all(
      selectedArticles.value.map((article, index) =>
        patchAssignArticleCategory(accountStore.token!, name.value, {
          articleId: article.id!,
          order: index
        })
      )
    );
  },

  onSuccess() {
    router.replace('/sprava/informace');
  }
});
</script>

<template>
  <CategoryEditorForm
    v-model:name="name"
    v-model:label="label"
    v-model:selected-articles="selectedArticles"
    title-key="admin.articles.new_category"
    submit-key="buttons.add"
    :submitting="isPending"
    @submit="submitCategory()"
  />
</template>
