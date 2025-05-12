<route>
meta:
  layout: desktop/center
</route>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuery, useMutation } from '@tanstack/vue-query';
import { useRouteParams } from '@vueuse/router';
import { useRouter } from 'vue-router';
import { accountStore } from '@/state/AccountStore';
import { getArticle, patchArticle, deleteArticleFile, patchArticleFile } from '@/api/articles';

import { ARTICLE_TEXT_FILENAME } from '@/constants/Articles'
import MaterialIcon from '@/components/MaterialIcon.vue';
import { MdEditor } from 'md-editor-v3';
import 'md-editor-v3/lib/style.css';


const router = useRouter();
const id = useRouteParams<string>('id');

const { data: article } = useQuery({
  queryKey: ["articles", id],
  queryFn: () => getArticle(id.value)
})

const deleteFiles = ref([] as string[]);
const name = ref("");
const description = ref("");
// const editorContent = ref(article.value);
const editorContent = ref('');

const { mutate: submitArticle } = useMutation({
  mutationFn: async ({ content }: { content: string }) => {

    for(const deletedFile of deleteFiles.value) {
      deleteArticleFile(accountStore.token!, id.value, deletedFile);
    }

    const textFile = new File(
      [
        content.replace(
          /!\[([^\]]*)\]\(((?:[^()]|\([^()]*\))*)\)/g,
          (_, alt, url) => `![${alt}](${encodeURI(url)})`
        )
      ],
      ARTICLE_TEXT_FILENAME,
      {
        type: 'text/markdown',
        lastModified: Date.now()
      }
    );

    for (const file of [textFile, ...files.value]) {
      patchArticleFile(accountStore.token!, id, file)
    }
  },

  onSuccess() {
    router.replace("/sprava/informace");
  }
})

</script>

<template>
  <h1>Úprava příspěvku</h1>
  <input v-model="name" type="text" placeholder="Nadpis" />
  <input v-model="description" type="text" placeholder="Popisek" />

  <div>
    <h2>Vyberte kategorie</h2>
    <v-select multiple v-model="categories" :options="availableCategories?.map(category => category.name)" :components="{ ListDeselect }" />
  </div>

  <MdEditor
    v-model="editorContent"
    language="en-US"
    :no-mermaid="true"
    :no-katex="true"
    :no-highlight="true"
    :no-prettier="true"
    :no-img-zoom-in="true"
    @upload-img="(newFiles) => article?.files?.push(...newFiles)"
    @save="(content) => submitArticle({ content })"
  />

  <ul class="flex flex-col w-full" @click.stop>
    <li v-for="file in article?.files" :key="file.filename" class="flex flex-row w-full items-center justify-between">
      <MaterialIcon class="h-10" :filename="file.filename" />
      <div class="flex flex-col">
        <p :class="{
          'line-through': deleteFiles.includes(file.filename)
        }">{{ file.filename }}</p>
      </div>
      <button
        v-if="!deleteFiles.includes(file.filename)"
        @click="deleteFiles.push(file.filename)"
        class="text-red-500"
      >
        Smazat
      </button>
      <button
        v-else
        @click="deleteFiles.splice(deleteFiles.indexOf(file.filename), 1)"
        class="text-red-500"
      >
        Obnovit
      </button>
    </li>
  </ul>

</template>
