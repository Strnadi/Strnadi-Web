<route lang="yaml">
meta:
  layout: desktop/center
</route>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useMutation, useQuery } from '@tanstack/vue-query';
import { useRouteParams } from '@vueuse/router';
import {
  deleteArticleFromCategory,
  getArticleCategories,
  patchArticleCategory,
  patchAssignArticleCategory,
  type Article
} from '@/api/articles';
import { accountStore } from '@/state/AccountStore.ts';
import { useRouter } from 'vue-router';
import CategoryEditorForm from '@/views/CategoryEditorForm.vue';

const name = useRouteParams<string>('name');
const router = useRouter();

const { data: categories } = useQuery({
  queryKey: ['article-categories'],
  queryFn: () => getArticleCategories()
});
const currentCategory = computed(() =>
  categories.value?.find((category) => category.name === name.value)
);

const categoryArticles = ref<Article[]>([]);
const originalArticleIds = ref<number[]>([]);
const editableName = ref(name.value);
const categoryLabel = ref('');
watch(currentCategory, (newVal) => {
  categoryArticles.value = newVal?.articles ? [...newVal.articles] : [];
  originalArticleIds.value = categoryArticles.value.flatMap((article) =>
    typeof article.id === 'number' ? [article.id] : []
  );
  categoryLabel.value = newVal?.label ?? '';
}, { immediate: true });

watch(name, (value) => {
  editableName.value = value;
});

const { mutate: mutateCategory, isPending, error } = useMutation({
  mutationFn: async () => {
    const originalName = name.value;
    await patchArticleCategory(accountStore.token!, originalName, {
      name: editableName.value,
      label: categoryLabel.value
    });

    const selectedIds = new Set(
      categoryArticles.value.flatMap((article) =>
        typeof article.id === 'number' ? [article.id] : []
      )
    );
    for (const articleId of originalArticleIds.value) {
      if (!selectedIds.has(articleId)) {
        await deleteArticleFromCategory(
          accountStore.token!,
          editableName.value,
          articleId
        );
      }
    }
    for (const [index, article] of categoryArticles.value.entries()) {
      if (typeof article.id === 'number') {
        await patchAssignArticleCategory(
          accountStore.token!,
          editableName.value,
          {
          articleId: article.id!,
          order: index
          }
        );
      }
    }
  },

  onSuccess() {
    router.replace('/sprava/informace');
  }
});
</script>

<template>
  <p v-if="error" role="alert" class="mb-3 text-red-700">
    {{ error.message }}
  </p>
  <CategoryEditorForm
    v-model:name="editableName"
    v-model:label="categoryLabel"
    v-model:selected-articles="categoryArticles"
    title-key="admin.articles.edit_category_title"
    :title-suffix="editableName"
    submit-key="buttons.save"
    :submitting="isPending"
    @submit="mutateCategory()"
  />
</template>
