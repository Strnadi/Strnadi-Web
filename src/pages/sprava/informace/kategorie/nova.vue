<route lang="yaml">
meta:
  layout: desktop/center
</route>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuery, useMutation } from '@tanstack/vue-query';
import {
  getArticles,
  postArticleCategory,
  patchAssignArticleCategory,
  type Article
} from '@/api/articles';
import { accountStore } from '@/state/AccountStore';
import { useRouter } from 'vue-router';
import ListDeselect from '@/components/ListDeselect.vue';
import draggable from 'vuedraggable';
import TranslatedText, { t } from '@/components/TranslatedText.vue';

const router = useRouter();

const name = ref('');
const label = ref('');

// Id's
const categoryArticles = ref<number[]>([]);

const { data: articles } = useQuery({
  queryKey: ['articles'],
  queryFn: () => getArticles()
});

// const categories = useQuery({ queryKey: ['articleCategories'], queryFn: getArticleCategories });

const { mutate: submitCategory } = useMutation({
  mutationFn: async () => {
    await postArticleCategory(accountStore.token!, {
      name: name.value,
      label: label.value
    });

    for (let index = 0; index < categoryArticles.value.length; index++) {
      const articleId = categoryArticles.value[index];
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
  <div class="flex flex-col gap-y-2">
    <h1>
      <TranslatedText identifier="admin.articles.new_category" />
    </h1>
    <input
      v-model="name"
      type="text"
      :placeholder="t('placeholders.title')"
      class="p-2"
    />
    <input
      v-model="label"
      type="text"
      :placeholder="t('placeholders.description')"
      class="p-2"
    />
    <div>
      <h2>
        <TranslatedText identifier="admin.articles.included_articles" />
      </h2>

      <draggable
        v-if="categoryArticles"
        v-model="categoryArticles"
        item-key="id"
      >
        <template #item="{ element: article }">
          <div class="flex flex-row gap-x-2">
            <button>
              <TranslatedText identifier="buttons.delete" />
            </button>
            <span
              >{{ articles?.find((a) => a.id === article)?.name }} (ID:
              {{ articles?.find((a) => a.id === article)?.id }})</span
            >
          </div>
        </template>

        <template #footer>
          <v-select
            v-model="categoryArticles"
            :options="articles"
            :reduce="(article: Article) => article.id"
            :components="{ ListDeselect }"
            label="name"
            multiple
          />
        </template>
      </draggable>
    </div>
    <button
      class="primary p-2"
      @click="submitCategory"
    >
      <TranslatedText identifier="buttons.add" />
    </button>
  </div>
</template>
