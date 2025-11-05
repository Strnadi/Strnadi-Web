<route lang="yaml">
meta:
  layout: desktop/center
</route>

<script setup lang="ts">
import { computed, watch, ref, reactive } from 'vue';
import { useQuery, useMutation } from '@tanstack/vue-query';
import { useRouteParams } from '@vueuse/router';
import { useRouter } from 'vue-router';
import { accountStore } from '@/state/AccountStore';
import ListDeselect from '@/components/ListDeselect.vue';
import {
  getArticle,
  getArticleFile,
  patchArticle,
  deleteArticleFile,
  patchArticleFile,
  postArticleFile,
  getArticleCategories,
  type Article
} from '@/api/articles';
import { ARTICLE_TEXT_FILENAME } from '@/constants/Articles';
import MaterialIcon from '@/components/MaterialIcon.vue';
import { MdEditor } from 'md-editor-v3';
import 'md-editor-v3/lib/style.css';
import type { Numeric } from '@/types/basic';
import { applicationStore } from '@/state/ApplicationStore';
import TranslatedText, { t } from '@/components/TranslatedText.vue';
import { translations } from '@/constants/Translations';

const router = useRouter();
const id = useRouteParams<Numeric>('id');

const supportedLanguages = Object.keys(translations);
const currentLanguage = ref(applicationStore.language);

const deleteFiles = ref<string[]>([]);
const name = ref('');
const description = ref('');
const categories = ref<string[]>([]);
const files = ref<File[]>([]);
/**
 * Multi-language editor contents.
 * Structure: { [langCode]: markdownContent }
 */
const editorContents = reactive<Record<string, string>>({});
/**
 * Original contents for comparison to detect changes.
 * Structure: { [langCode]: markdownContent }
 */
const originalContents = reactive<Record<string, string>>({});

// fetch article & initialize form
const { data: articleQuery } = useQuery({
  queryKey: ['articles', id],
  queryFn: () => getArticle(id.value)
});

// Computed binding for the currently selected language so we can use v-model seamlessly.
const editorContentProxy = computed({
  get: () => editorContents[currentLanguage.value] ?? '',
  set: (val: string) => {
    editorContents[currentLanguage.value] = val;
  }
});

// initialize form when the article metadata arrives and fetch all language files
watch(
  () => articleQuery.value,
  async (data?: Article) => {
    if (!data) return;
    name.value = data.name;
    description.value = data.description;
    categories.value = (data as any).categories?.map((c: any) => c.name) ?? [];

    // Find all language markdown files and fetch them
    const languageFiles = data.files?.filter((f) => supportedLanguages.includes(f.fileName?.split('.')[0] ?? '')) ?? [];

    // Fetch all language files in parallel
    const fetchPromises = languageFiles.map(async (file) => {
      if (!file.fileName) return;
      try {
        const content = await getArticleFile(Number(id.value), file.fileName);
        editorContents[file.fileName?.split('.')[0] ?? ''] = content;
        originalContents[file.fileName?.split('.')[0] ?? ''] = content;
      } catch (error) {
        // File might not exist or be accessible, skip it
        console.warn(`Failed to fetch ${file.fileName}:`, error);
      }
    });

    await Promise.all(fetchPromises);
  },
  { immediate: true }
);

const article = computed(() => articleQuery.value);

// fetch available categories
const { data: availableCategories } = useQuery({
  queryKey: ['articleCategories'],
  queryFn: () => getArticleCategories()
});

const { mutate: submitArticle } = useMutation({
  mutationFn: async () => {
    const ops: Promise<any>[] = [];

    // metadata update
    const origCats = ((article.value as any)?.categories ?? []).map((c: any) => c.name);
    if (
      name.value !== article.value!.name ||
      description.value !== article.value!.description ||
      JSON.stringify(categories.value) !== JSON.stringify(origCats)
    ) {
      ops.push(
        patchArticle(accountStore.token!, id.value, {
          name: name.value,
          description: description.value
          // categories: categories.value
        })
      );
    }

    // remove deleted files
    for (const fn of deleteFiles.value) {
      ops.push(deleteArticleFile(accountStore.token!, id.value, fn));
    }

    // Handle language markdown files
    // Get all original language files that existed
    const originalLangFiles = new Set(Object.keys(originalContents));
    // Get all current language files (including newly added languages)
    const currentLangFiles = new Set(
      Object.keys(editorContents).filter((lang) => editorContents[lang]?.trim())
    );

    // Update existing language files that have changed
    for (const lang of currentLangFiles) {
      const currentContent = editorContents[lang];
      const originalContent = originalContents[lang];

      if (!currentContent) continue;

      // If it's a new language or content has changed
      if (!originalContent || currentContent !== originalContent) {
        const processedContent = currentContent.replace(
          /!\[([^\]]*)\]\(((?:[^()]|\([^()]*\))*)\)/g,
          (_: unknown, alt: string, url: string) => `![${alt}](${encodeURI(url)})`
        );

        const textFile = new File([processedContent], `${lang}.md`, {
          type: 'text/markdown',
          lastModified: Date.now()
        });

        if (originalContent) {
          // Update existing file
          ops.push(
            patchArticleFile(accountStore.token!, id.value, `${lang}.md`, textFile)
          );
        } else {
          // Create new file
          ops.push(postArticleFile(accountStore.token!, id.value, textFile));
        }
      }
    }

    // Delete language files that were removed (emptied)
    for (const lang of originalLangFiles) {
      if (!currentLangFiles.has(lang)) {
        ops.push(deleteArticleFile(accountStore.token!, id.value, `${lang}.md`));
      }
    }

    // upload new attachments
    for (const f of files.value) {
      ops.push(postArticleFile(accountStore.token!, id.value, f));
    }

    await Promise.all(ops);
  },
  onSuccess() {
    router.replace('/sprava/informace');
  }
});
</script>

<template>
  <h1>
    <TranslatedText identifier="admin.articles.edit_title" />
  </h1>
  <div class="flex flex-col gap-y-2">
    <input
      v-model="name"
      type="text"
      :placeholder="t('placeholders.title')"
      class="p-2"
    />
    <input
      v-model="description"
      type="text"
      :placeholder="t('placeholders.description')"
      class="p-2"
    />
  </div>

  <div class="flex flex-row items-center gap-x-2">
    <div class="flex flex-1 flex-row gap-x-2">
      <h2>
        <TranslatedText identifier="admin.articles.select_categories" />
      </h2>
      <v-select
        v-model="categories"
        class="flex-1"
        multiple
        :options="availableCategories?.map((category) => category.name)"
        :components="{ ListDeselect }"
      />
    </div>

    <!-- Language selector -->
    <div class="mb-4">
      <label for="lang-select" class="mr-2 font-bold">
        <TranslatedText identifier="labels.language" />:
      </label>
      <select id="lang-select" v-model="currentLanguage" class="border p-1 rounded">
        <option v-for="lang in supportedLanguages" :key="lang" :value="lang">
          {{ translations[lang as keyof typeof translations]?.lang_name }}
        </option>
      </select>
    </div>
  </div>

  <MdEditor
    v-model="editorContentProxy"
    @upload-img="(newFiles) => files.push(...newFiles)"
    @save="() => submitArticle()"
    language="en-US"
    :no-mermaid="true"
    :no-katex="true"
    :no-highlight="true"
    :no-prettier="true"
    :no-img-zoom-in="true"
  />

  <ul class="flex flex-col w-full" @click.stop>
    <!-- Existing files -->
    <li
      v-for="file in article?.files?.filter(
        (f) => {
          if (!f.fileName) return false;
          // Exclude language markdown files (e.g., cs.md, en.md) and legacy Text.md
          const isLangFile = /^[a-z]{2}\.md$/.test(f.fileName);
          return f.fileName !== ARTICLE_TEXT_FILENAME && !isLangFile;
        }
      ) ?? []"
      :key="file.fileName ?? `file-${file.id}`"
      class="flex flex-row w-full items-center justify-between"
    >
      <div class="flex flex-row gap-x-2 items-center">
        <MaterialIcon v-if="file.fileName" class="h-10" :filename="file.fileName" />
        <div class="flex flex-col">
          <p
            v-if="file.fileName"
            :class="{
              'line-through': deleteFiles.includes(file.fileName)
            }"
          >
            {{ file.fileName }}
          </p>
        </div>
      </div>
      <button
        v-if="file.fileName && !deleteFiles.includes(file.fileName)"
        class="text-red-500"
        @click="deleteFiles.push(file.fileName)"
      >
        <TranslatedText identifier="buttons.delete" />
      </button>
      <button
        v-else-if="file.fileName"
        class="text-red-500"
        @click="deleteFiles.splice(deleteFiles.indexOf(file.fileName), 1)"
      >
        <TranslatedText identifier="buttons.restore" />
      </button>
    </li>

    <!-- Newly added files -->
    <li
      v-for="(file, index) in files"
      :key="`new-${index}`"
      class="flex flex-row w-full items-center justify-between"
    >
      <div class="flex flex-row gap-x-2 items-center">
        <MaterialIcon class="h-10" :filename="file.name" />
        <div class="flex flex-col">
          <p class="text-green-600">
            {{ file.name }}
            <span class="text-sm">
              {{ t('admin.articles.new_file_suffix') }}
            </span>
          </p>
        </div>
      </div>
      <button class="text-red-500" @click="files.splice(index, 1)">
        <TranslatedText identifier="buttons.remove" />
      </button>
    </li>
  </ul>

  <button
    class="primary p-2 w-full"
    @click="() => submitArticle()"
  >
    <TranslatedText identifier="buttons.save" />
  </button>
</template>
