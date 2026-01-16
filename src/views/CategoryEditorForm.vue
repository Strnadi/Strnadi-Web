<script setup lang="ts">
import { computed } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import draggable from 'vuedraggable';
import type { Article } from '@/api/articles';
import { getArticles } from '@/api/articles';
import ListDeselect from '@/components/ListDeselect.vue';
import TranslatedText, { t } from '@/components/TranslatedText.vue';

const props = withDefaults(
  defineProps<{
    name: string;
    label: string;
    selectedArticles: Article[];
    titleKey: string;
    submitKey: string;
    submitting?: boolean;
    titleSuffix?: string;
  }>(),
  {
    name: '',
    label: '',
    selectedArticles: () => [],
    submitting: false,
    titleSuffix: ''
  }
);

const emit = defineEmits<{
  (e: 'update:name', value: string): void;
  (e: 'update:label', value: string): void;
  (e: 'update:selectedArticles', value: Article[]): void;
  (e: 'submit'): void;
}>();

const formName = computed({
  get: () => props.name,
  set: (value: string) => emit('update:name', value)
});

const formLabel = computed({
  get: () => props.label,
  set: (value: string) => emit('update:label', value)
});

const formArticles = computed({
  get: () => props.selectedArticles ?? [],
  set: (value: Article[]) => emit('update:selectedArticles', value)
});

const { data: articles } = useQuery({
  queryKey: ['articles'],
  queryFn: () => getArticles()
});

const removeArticle = (articleId?: number) => {
  if (typeof articleId === 'undefined') return;
  emit(
    'update:selectedArticles',
    formArticles.value.filter((article) => article.id !== articleId)
  );
};

const emitSubmit = () => emit('submit');
</script>

<template>
  <div
    class="flex flex-col w-full gap-y-3"
    @dragenter.prevent.stop
  >
    <h1 class="text-2xl font-semibold text-slate-900">
      <TranslatedText :identifier="titleKey" />
      <span
        v-if="titleSuffix"
        class="ml-2 text-base font-normal text-slate-500"
      >
        {{ titleSuffix }}
      </span>
    </h1>

    <div class="w-full">
      <label
        for="category-name"
        class="block text-sm font-medium mb-1"
      >
        <TranslatedText identifier="admin.articles.category_name_label" />
      </label>
      <input
        id="category-name"
        v-model="formName"
        type="text"
        :placeholder="t('placeholders.title')"
        class="w-full p-2 border rounded"
      />
    </div>

    <div class="w-full">
      <label
        for="category-label"
        class="block text-sm font-medium mb-1"
      >
        <TranslatedText
          identifier="admin.articles.category_description_label"
        />
      </label>
      <input
        id="category-label"
        v-model="formLabel"
        type="text"
        :placeholder="t('placeholders.description')"
        class="w-full p-2 border rounded"
      />
    </div>

    <div class="flex flex-col gap-y-2">
      <draggable
        v-model="formArticles"
        item-key="id"
        handle=".category-drag-handle"
        ghost-class="category-drop-ghost"
        chosen-class="category-chosen"
        class="flex flex-col gap-y-2"
      >
        <template #item="{ element: article }">
          <div class="category-item category-drag-handle">
            <!-- <button
              type="button"
              class="category-drag-handle"
              aria-label="Reorder"
            >
              <MaterialIcon name="drag_indicator" />
            </button> -->
            <div class="flex-1">
              <p class="font-medium">{{ article.name }}</p>
            </div>
            <button
              type="button"
              class="text-sm text-rose-600 hover:text-rose-700"
              @click="removeArticle(article.id)"
            >
              Odstranit z kategorie
            </button>
          </div>
        </template>

        <template #footer>
          <v-select
            v-model="formArticles"
            :components="{ ListDeselect }"
            :options="articles ?? []"
            label="name"
            multiple
            placeholder=""
          />
        </template>
      </draggable>
    </div>

    <button
      class="primary p-2"
      :disabled="submitting"
      @click="emitSubmit"
    >
      <TranslatedText :identifier="submitKey" />
    </button>
  </div>
</template>

<style scoped>
.category-item {
  align-items: center;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  background-color: #fff;
}

.category-drag-handle {
  cursor: grab;
  align-items: center;
  display: flex;
  padding: 0.25rem;
  color: #475569;
}

.category-drag-handle:active {
  cursor: grabbing;
}

.category-drop-ghost {
  opacity: 1 !important;
  background: transparent !important;
  position: relative;
}

.category-drop-ghost::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: -6px;
  height: 4px;
  border-radius: 999px;
  background: linear-gradient(90deg, #06b6d4, #2563eb);
}

.category-chosen {
  opacity: 0.6;
}
</style>
