<route lang="yaml">
meta:
  layout: desktop/center
</route>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useMutation, useQuery } from '@tanstack/vue-query';
import { useRouteParams } from '@vueuse/router';
import {
  getArticles,
  getArticleByCategory,
  postArticleCategory,
  patchAssignArticleCategory
} from '@/api/articles';
import ListDeselect from '@/components/ListDeselect.vue';
import draggable from 'vuedraggable';
import { accountStore } from '@/state/AccountStore.ts';
import { useRouter } from 'vue-router';
import TranslatedText, { t } from '@/components/TranslatedText.vue';

const name = useRouteParams<string>('name');
const router = useRouter();

const { data: articles } = useQuery({
  queryKey: ['articles'],
  queryFn: () => getArticles()
});

const { data: currentCategory } = useQuery({
  queryKey: ['categories', name],
  queryFn: () => getArticleByCategory(name.value)
});

const categoryArticles = ref<typeof currentCategory.value>([]);
watch(currentCategory, (newVal) => {
  if (newVal) categoryArticles.value = [...newVal];
});

const newName = ref(name.value);
const description = ref('');

const { mutate: mutateCategory } = useMutation({
  mutationFn: async () => {
    for (let index = 0; index < categoryArticles.value.length ?? 0; index++) {
      const articleId = categoryArticles.value[index]!;

      patchAssignArticleCategory(accountStore.token!, name.value, {
        articleId,
        order: index
      });
    }
  },

  onSuccess() {
    router.replace('/sprava/informace');
  }
});
</script>

<template>
  <div class="flex flex-col w-full gap-y-2" @dragenter.prevent.stop>
    <h1>
      <TranslatedText identifier="admin.articles.edit_category_title" />
      {{ newName }}
    </h1>
    <div class="w-full">
      <label for="title" class="block text-sm font-medium mb-1">
        <TranslatedText identifier="admin.articles.category_name_label" />
      </label>
      <input
        id="title"
        v-model="newName"
        type="text"
        :placeholder="t('placeholders.title')"
        class="w-full p-2 border rounded"
      />
    </div>
    <div class="w-full">
      <label for="description" class="block text-sm font-medium mb-1">
        <TranslatedText
          identifier="admin.articles.category_description_label"
        />
      </label>
      <input
        id="description"
        v-model="description"
        type="text"
        :placeholder="t('placeholders.description')"
        class="w-full p-2 border rounded"
      />
    </div>

    <draggable v-if="categoryArticles" v-model="categoryArticles" item-key="id">
      <template #item="{ element: article }">
        <div class="flex flex-row gap-x-2">
          <button>
            <TranslatedText identifier="buttons.delete" />
          </button>
          <span>{{ article.name }} (ID: {{ article.id }})</span>
        </div>
      </template>

      <template #footer>
        <div>
          <v-select
            v-model="categoryArticles"
            :components="{ ListDeselect }"
            :options="articles"
            label="name"
            multiple
          />
        </div>
      </template>
    </draggable>
    <button class="primary p-2" @click="mutateCategory">
      <TranslatedText identifier="buttons.save" />
    </button>
  </div>
</template>
