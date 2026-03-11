<script setup vapor lang="ts">
import {
  computed,
  reactive,
  ref,
  watch,
  onMounted,
  onBeforeUnmount
} from 'vue';
import { useQuery, useMutation } from '@tanstack/vue-query';
import { useRouter, onBeforeRouteLeave } from 'vue-router';
import MaterialIcon from '@/components/MaterialIcon.vue';
import ListDeselect from '@/components/ListDeselect.vue';
import { MdEditor } from 'md-editor-v3';
import Dropzone from '@/components/Dropzone.vue';
import 'md-editor-v3/lib/style.css';
import 'vue-select/dist/vue-select.css';
import {
  getArticle,
  getArticleCategories,
  getArticleFile,
  patchArticle,
  deleteArticleFile,
  patchArticleFile,
  postArticle,
  postArticleFile,
  patchAssignArticleCategory,
  type Article
} from '@/api/articles';
import { accountStore } from '@/state/AccountStore';
import { applicationStore } from '@/state/ApplicationStore';
import { translations } from '@/constants/Translations';
import TranslatedText, { t } from '@/components/TranslatedText.vue';
import type { Numeric } from '@/types/basic';

const props = defineProps<{ mode: 'create' | 'edit'; articleId?: Numeric }>();

const router = useRouter();

const supportedLanguages = Object.keys(translations);
const currentLanguage = ref(applicationStore.language);
const files = ref<File[]>([]);
const deleteFiles = ref<string[]>([]);
const name = ref('');
const description = ref('');
const categories = ref<string[]>([]);
const editorContents = reactive<Record<string, string>>({});
const originalContents = reactive<Record<string, string>>({});

const isEditMode = computed(() => props.mode === 'edit');
const numericArticleId = computed(() => {
  if (!isEditMode.value) return undefined;
  if (typeof props.articleId === 'number') return props.articleId;
  if (typeof props.articleId === 'string') {
    const parsed = Number(props.articleId);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
});

const editorContentProxy = computed({
  get: () => editorContents[currentLanguage.value] ?? '',
  set: (val: string) => {
    editorContents[currentLanguage.value] = val;
  }
});

const { data: availableCategories } = useQuery({
  queryKey: ['articleCategories'],
  queryFn: () => getArticleCategories()
});

const { data: articleQuery } = useQuery({
  queryKey: ['articles', numericArticleId],
  queryFn: () => getArticle(numericArticleId.value!),
  enabled: computed(
    () => isEditMode.value && typeof numericArticleId.value === 'number'
  )
});

const article = computed(() => articleQuery.value);

const clearEditorMaps = () => {
  for (const key of Object.keys(editorContents)) {
    delete editorContents[key];
  }
  for (const key of Object.keys(originalContents)) {
    delete originalContents[key];
  }
};

const fetchArticleFiles = async (data: Article) => {
  const languageFiles =
    data.files?.filter((f) =>
      supportedLanguages.includes(f.fileName?.split('.')[0] ?? '')
    ) ?? [];

  const promises = languageFiles.map(async (file) => {
    if (!file.fileName || typeof numericArticleId.value !== 'number') return;
    try {
      const content = await getArticleFile(
        numericArticleId.value,
        file.fileName
      );
      const lang = file.fileName.split('.')[0] ?? '';
      editorContents[lang] = content;
      originalContents[lang] = content;
    } catch (error) {
      console.warn(`Failed to fetch ${file.fileName}:`, error);
    }
  });

  await Promise.all(promises);
};

watch(
  () => articleQuery.value,
  async (data?: Article) => {
    if (!data) return;
    name.value = data.name;
    description.value = data.description;
    categories.value = (data as any).categories?.map((c: any) => c.name) ?? [];
    deleteFiles.value = [];
    files.value = [];
    clearEditorMaps();
    await fetchArticleFiles(data);
    resetDirtySnapshot();
  },
  { immediate: true }
);
onMounted(() => {
  if (!isEditMode.value) {
    resetDirtySnapshot();
  }
});

const normalizeContents = () => {
  return Object.keys(editorContents)
    .sort()
    .reduce<Record<string, string>>((acc, key) => {
      acc[key] = editorContents[key];
      return acc;
    }, {});
};

const buildDirtyPayload = () => ({
  name: name.value,
  description: description.value,
  categories: [...categories.value],
  editorContents: normalizeContents(),
  deleteFiles: [...deleteFiles.value].sort(),
  files: files.value.map((file) => `${file.name}-${file.size}`)
});

const dirtySnapshot = ref('');
const computeSnapshot = () => JSON.stringify(buildDirtyPayload());
const resetDirtySnapshot = () => {
  dirtySnapshot.value = computeSnapshot();
};

const isDirty = computed(() => computeSnapshot() !== dirtySnapshot.value);
const leaveWarningMessage = computed(() =>
  t('admin.articles.leave_dirty_warning')
);

const sanitizeMarkdown = (content: string) =>
  content.replace(
    /!\[([^\]]*)\]\(((?:[^()]|\([^()]*\))*)\)/g,
    (_: unknown, alt: string, url: string) => `![${alt}](${encodeURI(url)})`
  );

const buildMarkdownFile = (lang: string, rawContent: string) =>
  new File([sanitizeMarkdown(rawContent)], `${lang}.md`, {
    type: 'text/markdown',
    lastModified: Date.now()
  });

const onAttachmentDrop = (acceptedFiles: File[]) => {
  if (!acceptedFiles?.length) return;
  files.value.push(...acceptedFiles);
};

const uploadLanguageFiles = async (articleId: number) => {
  const uploads = Object.entries(editorContents)
    .filter(([, content]) => content?.trim())
    .map(([lang, content]) =>
      postArticleFile(
        accountStore.token!,
        articleId,
        buildMarkdownFile(lang, content)
      )
    );

  await Promise.all(uploads);
};

const uploadAttachments = async (articleId: number) => {
  if (!files.value.length) return;
  const uploads = files.value.map((file) =>
    postArticleFile(accountStore.token!, articleId, file)
  );
  await Promise.all(uploads);
};

const submitCreate = async () => {
  const id = await postArticle(accountStore.token!, {
    name: name.value,
    description: description.value
  });

  const numericId = Number(id);
  await uploadLanguageFiles(numericId);
  await uploadAttachments(numericId);

  await Promise.all(
    (categories.value ?? []).map((category) =>
      patchAssignArticleCategory(accountStore.token!, category, {
        articleId: numericId,
        order: 0
      })
    )
  );
};

const submitEdit = async (articleId: number) => {
  const ops: Promise<unknown>[] = [];
  if (article.value) {
    const origCats = ((article.value as any)?.categories ?? []).map(
      (c: any) => c.name
    );
    if (
      name.value !== article.value.name ||
      description.value !== article.value.description ||
      JSON.stringify(categories.value) !== JSON.stringify(origCats)
    ) {
      ops.push(
        patchArticle(accountStore.token!, articleId, {
          name: name.value,
          description: description.value
        })
      );
    }
  }

  for (const fn of deleteFiles.value) {
    ops.push(deleteArticleFile(accountStore.token!, articleId, fn));
  }

  const originalLangFiles = new Set(Object.keys(originalContents));
  const currentLangFiles = new Set(
    Object.keys(editorContents).filter((lang) => editorContents[lang]?.trim())
  );

  for (const lang of currentLangFiles) {
    const currentContent = editorContents[lang];
    const originalContent = originalContents[lang];
    if (!currentContent) continue;

    const file = buildMarkdownFile(lang, currentContent);

    if (!originalContent) {
      ops.push(postArticleFile(accountStore.token!, articleId, file));
    } else if (currentContent !== originalContent) {
      ops.push(
        patchArticleFile(accountStore.token!, articleId, `${lang}.md`, file)
      );
    }
  }

  for (const lang of originalLangFiles) {
    if (!currentLangFiles.has(lang)) {
      ops.push(deleteArticleFile(accountStore.token!, articleId, `${lang}.md`));
    }
  }

  ops.push(uploadAttachments(articleId));

  await Promise.all(ops);
};

const { mutate: submitArticle, isPending: isSubmitting } = useMutation({
  mutationFn: async () => {
    if (isEditMode.value) {
      if (typeof numericArticleId.value !== 'number') {
        throw new Error('Missing article id for edit mode');
      }
      await submitEdit(numericArticleId.value);
      return;
    }

    await submitCreate();
  },
  onSuccess() {
    resetDirtySnapshot();
    router.replace('/sprava/informace');
  }
});

const beforeUnloadHandler = (event: BeforeUnloadEvent) => {
  if (typeof window === 'undefined') return;
  if (!isDirty.value || isSubmitting.value) return;
  event.preventDefault();
  event.returnValue = leaveWarningMessage.value;
};

watch(
  () => isDirty.value && !isSubmitting.value,
  (shouldListen) => {
    if (typeof window === 'undefined') return;
    if (shouldListen) {
      window.addEventListener('beforeunload', beforeUnloadHandler);
    } else {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
    }
  },
  { immediate: true }
);

onBeforeRouteLeave((_, __, next) => {
  if (!isDirty.value || isSubmitting.value) {
    next();
    return;
  }

  if (window.confirm(leaveWarningMessage.value)) {
    next();
    return;
  }

  next(false);
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('beforeunload', beforeUnloadHandler);
  }
});

const primaryTitleIdentifier = computed(() =>
  isEditMode.value ? 'admin.articles.edit_title' : 'admin.articles.new_title'
);
</script>

<template>
  <div class="flex flex-col gap-y-6">
    <h1>
      <TranslatedText :identifier="primaryTitleIdentifier" />
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
        v-if="isEditMode"
        v-for="file in article?.files?.filter((f) => {
          if (!f.fileName) return false;
          const isLangFile = Object.keys(translations).includes(
            f.fileName?.split('.')[0] ?? ''
          );
          return !isLangFile;
        }) ?? []"
        :key="file.fileName ?? `file-${file.id}`"
        class="flex flex-row w-full items-center justify-between"
      >
        <div class="flex flex-row gap-x-2 items-center">
          <MaterialIcon
            v-if="file.fileName"
            class="h-10"
            :filename="file.fileName"
          />
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

      <li
        v-for="(file, index) in files"
        :key="`new-${index}`"
        class="flex flex-row w-full items-center justify-between"
      >
        <div class="flex flex-row gap-x-2 items-center">
          <MaterialIcon
            class="h-10"
            :filename="file.name"
          />
          <div class="flex flex-col">
            <p :class="{ 'text-green-600': isEditMode }">
              {{ file.name }}
              <span
                v-if="isEditMode"
                class="text-sm"
              >
                {{ t('admin.articles.new_file_suffix') }}
              </span>
            </p>
          </div>
        </div>
        <button
          class="text-red-500"
          @click="files.splice(index, 1)"
        >
          <TranslatedText
            :identifier="isEditMode ? 'buttons.remove' : 'buttons.delete'"
          />
        </button>
      </li>
    </ul>

    <div class="flex flex-col gap-y-2">
      <h2 class="font-semibold">
        <TranslatedText identifier="upload.select_or_drag_files" />
      </h2>
      <Dropzone
        :multiple="true"
        @drop="onAttachmentDrop"
      >
        <template #dragging>
          <div class="text-center py-6">
            <p class="text-sm sm:text-base font-medium">
              <TranslatedText identifier="upload.drop_files_here" />
            </p>
          </div>
        </template>

        <div class="flex flex-col items-center gap-y-3 py-4">
          <div class="text-3xl">📎</div>
          <p class="text-xs sm:text-sm text-gray-600 text-center px-2">
            <TranslatedText identifier="upload.select_or_drag_files" />
          </p>
        </div>
      </Dropzone>
    </div>

    <button
      class="primary p-2 w-full"
      :disabled="isSubmitting"
      @click="() => submitArticle()"
    >
      <TranslatedText identifier="buttons.save" />
    </button>
  </div>
</template>
