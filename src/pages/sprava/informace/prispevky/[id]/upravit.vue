<route lang="yaml">
meta:
  layout: desktop/center
</route>

<script setup lang="ts">
import { computed, watch, ref } from 'vue'
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

const router = useRouter();
const id = useRouteParams<Numeric>('id');

const deleteFiles = ref<string[]>([]);
const name = ref('');
const description = ref('');
const categories = ref<string[]>([]);
const files = ref<File[]>([]);
const originalContent = ref('');
const editorContent = ref('');

// fetch article & initialize form
const { data: articleQuery } = useQuery({
  queryKey: ['articles', id],
  queryFn: () => getArticle(id.value)
})

// fetch markdown text separately
const { data: textQuery } = useQuery({
  queryKey: ['articles', id, 'text'],
  queryFn: () => getArticleFile(id.value, ARTICLE_TEXT_FILENAME),
  enabled: computed(() => !!id.value)
})

// initialize form when the article metadata arrives
watch(
  () => articleQuery.value,
  (data?: Article) => {
    if (!data) return;
    name.value = data.name;
    description.value = data.description;
    categories.value = data.categories.map((c: any) => c.name);
  },
  { immediate: true }
)

// initialize editor when the markdown arrives
watch(
  () => textQuery.value,
  (md?: string) => {
    if (md == null) return
    originalContent.value = md
    editorContent.value = md
  },
  { immediate: true }
)

const article = computed(() => articleQuery.value);

// fetch available categories
const { data: availableCategories } = useQuery({
  queryKey: ['articleCategories'],
  queryFn: () => getArticleCategories()
});

const { mutate: submitArticle } = useMutation({
  mutationFn: async ({ content }: { content: string }) => {
    const ops: Promise<any>[] = [];

    // metadata update
    const origCats = article.value!.categories.map((c: any) => c.name);
    if (
      name.value !== article.value!.name ||
      description.value !== article.value!.description ||
      JSON.stringify(categories.value) !== JSON.stringify(origCats)
    ) {
      ops.push(
        patchArticle(accountStore.token!, id.value, {
          name: name.value,
          description: description.value,
          categories: categories.value
        })
      );
    }

    // remove deleted files
    for (const fn of deleteFiles.value) {
      ops.push(deleteArticleFile(accountStore.token!, id.value, fn));
    }

    // text update
    if (content !== originalContent.value) {
      const textFile = new File(
        [
          content.replace(
            /!\[([^\]]*)\]\(((?:[^()]|\([^()]*\))*)\)/g,
            (_, alt, url) => `![${alt}](${encodeURIComponent(url)})`
          )
        ],
        ARTICLE_TEXT_FILENAME,
        {
          type: 'text/markdown',
          lastModified: Date.now()
        }
      );
      ops.push(patchArticleFile(accountStore.token!, id.value, ARTICLE_TEXT_FILENAME, textFile));
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
  <h1>Úprava příspěvku</h1>
  <input
    v-model="name"
    type="text"
    placeholder="Nadpis"
  >
  <input
    v-model="description"
    type="text"
    placeholder="Popisek"
  >

  <div>
    <h2>Vyberte kategorie</h2>
    <v-select
      v-model="categories"
      multiple
      :options="availableCategories?.map(category => category.name)"
      :components="{ ListDeselect }"
    />
  </div>

  <MdEditor
    v-model="editorContent"
    @upload-img="newFiles => files.push(...newFiles)"
    @save="content => submitArticle({ content })"
    language="en-US"
    :no-mermaid="true"
    :no-katex="true"
    :no-highlight="true"
    :no-prettier="true"
    :no-img-zoom-in="true"
  />

  <ul
    class="flex flex-col w-full"
    @click.stop
  >
    <li
      v-for="file in article?.files?.filter(f => f.fileName !== ARTICLE_TEXT_FILENAME) ?? []"
      :key="file.fileName"
      class="flex flex-row w-full items-center justify-between"
    >
      <div class="flex flex-row gap-x-2 items-center">
        <MaterialIcon
          class="h-10"
          :filename="file.fileName"
        />
        <div class="flex flex-col">
          <p
            :class="{
              'line-through': deleteFiles.includes(file.fileName)
            }"
          >
            {{ file.fileName }}
          </p>
        </div>
      </div>
      <button
        v-if="!deleteFiles.includes(file.fileName)"
        class="text-red-500"
        @click="deleteFiles.push(file.fileName)"
      >
        Smazat
      </button>
      <button
        v-else
        class="text-red-500"
        @click="deleteFiles.splice(deleteFiles.indexOf(file.fileName), 1)"
      >
        Obnovit
      </button>
    </li>
  </ul>

  <button class="primary p-2 w-full" @click="() => submitArticle({ content: editorContent })">
    Uložit
  </button>
</template>
