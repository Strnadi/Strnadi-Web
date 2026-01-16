<route lang="yaml">
meta:
  layout: desktop/center
</route>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useMutation, useQuery } from '@tanstack/vue-query';
import { useRouteParams } from '@vueuse/router';
import {
  getArticleByCategory,
  patchAssignArticleCategory,
  type Article
} from '@/api/articles';
import { accountStore } from '@/state/AccountStore.ts';
import { useRouter } from 'vue-router';
import CategoryEditorForm from '@/views/CategoryEditorForm.vue';

const name = useRouteParams<string>('name');
const router = useRouter();

const { data: currentCategory } = useQuery({
  queryKey: ['categories', name],
  queryFn: () => getArticleByCategory(name.value)
});

const categoryArticles = ref<Article[]>([]);
watch(currentCategory, (newVal) => {
  categoryArticles.value = newVal ? [...newVal] : [];
});

const editableName = ref(name.value);
const categoryLabel = ref('');

watch(name, (value) => {
  editableName.value = value;
});

const { mutate: mutateCategory, isPending } = useMutation({
  mutationFn: async () => {
    await Promise.all(
      categoryArticles.value.map((article, index) =>
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
