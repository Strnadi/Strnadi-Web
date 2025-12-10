<route lang="yaml">
meta:
  layout: desktop/center
</route>

<script setup vapor lang="ts">
import { ref, reactive, computed } from 'vue';
import { useQuery, useMutation } from '@tanstack/vue-query';
import {
  getArticleCategories,
  postArticle,
  postArticleFile,
  patchAssignArticleCategory
} from '@/api/articles';
import { accountStore } from '@/state/AccountStore';
import { useRouter } from 'vue-router';
import MaterialIcon from '@/components/MaterialIcon.vue';
import { MdEditor } from 'md-editor-v3';
import ListDeselect from '@/components/ListDeselect.vue';
import 'md-editor-v3/lib/style.css';
import 'vue-select/dist/vue-select.css';
import { translations } from '@/constants/Translations';
import { applicationStore } from '@/state/ApplicationStore';
import TranslatedText, { t } from '@/components/TranslatedText.vue';

const router = useRouter();

const files = ref([] as File[]);
const name = ref('');
const description = ref('');
/**
 * Multi-language editor contents. Default language is Czech (cs).
 * Structure: { [langCode]: markdownContent }
 */
const editorContents = reactive<Record<string, string>>({});

const supportedLanguages = Object.keys(translations);
const currentLanguage = ref(applicationStore.language);

// Computed binding for the currently selected language so we can use v-model seamlessly.
const editorContentProxy = computed({
  get: () => editorContents[currentLanguage.value] ?? '',
  set: (val: string) => {
    editorContents[currentLanguage.value] = val;
  }
});
const categories = ref<string[]>();

const { data: availableCategories } = useQuery({
  queryKey: ['categories'],
  queryFn: () => getArticleCategories()
});

const { mutate: submitArticle } = useMutation({
  // We no longer receive a single markdown string, but submit will ignore its param and use editorContents
  mutationFn: async () => {
    const id = await postArticle(accountStore.token!, {
      name: name.value,
      description: description.value
    });

    const numericId = Number(id);

    // Upload markdown file for each language present in editorContents
    for (const [lang, rawContent] of Object.entries(editorContents)) {
      if (!rawContent) continue; // Skip empty languages

      const processedContent = rawContent.replace(
        /!\[([^\]]*)\]\(((?:[^()]|\([^()]*\))*)\)/g,
        (_: unknown, alt: string, url: string) => `![${alt}](${encodeURI(url)})`
      );

      const textFile = new File([processedContent], `${lang}.md`, {
        type: 'text/markdown',
        lastModified: Date.now()
      });

      postArticleFile(accountStore.token!, numericId, textFile);
    }

    // Upload any additional assets provided by user
    for (const file of files.value) {
      postArticleFile(accountStore.token!, numericId, file);
    }

    for (const category of categories?.value ?? []) {
      patchAssignArticleCategory(accountStore.token!, category, {
        articleId: numericId,
        order: 0
      });
    }
  },

  onSuccess() {
    router.replace('/sprava/informace');
  }
});
</script>

<template>
  <h1>
    <TranslatedText identifier="admin.articles.new_title" />
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
      <label
        for="lang-select"
        class="mr-2 font-bold"
      >
        <TranslatedText identifier="labels.language" />:
      </label>
      <select
        id="lang-select"
        v-model="currentLanguage"
        class="border p-1 rounded"
      >
        <option
          v-for="lang in supportedLanguages"
          :key="lang"
          :value="lang"
        >
          {{ translations[lang as keyof typeof translations]?.lang_name }}
        </option>
      </select>
    </div>
  </div>

  <MdEditor
    v-model="editorContentProxy"
    language="en-US"
    :no-mermaid="true"
    :no-katex="true"
    :no-highlight="true"
    :no-prettier="true"
    :no-img-zoom-in="true"
    @upload-img="(newFiles) => files.push(...newFiles)"
    @save="() => submitArticle()"
  />

  <ul
    class="flex flex-col w-full"
    @click.stop
  >
    <li
      v-for="(file, index) in files"
      :key="file.name"
      class="flex flex-row w-full items-center justify-between"
    >
      <MaterialIcon
        class="h-10"
        :filename="file.name"
      />
      <div class="flex flex-col">
        <p>{{ file.name }}</p>
        <p>{{ file.size / 1_000_000 }} MB</p>
      </div>
      <button
        class="text-red-500"
        @click="files.splice(index, 1)"
      >
        <TranslatedText identifier="buttons.delete" />
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
