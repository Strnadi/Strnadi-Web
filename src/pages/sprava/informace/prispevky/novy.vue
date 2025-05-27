<route>
meta:
  layout: desktop/center
</route>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuery, useMutation } from '@tanstack/vue-query';
import { getArticleCategories, postArticle, postArticleFile, patchAssignArticleCategory } from '@/api/articles';
import { accountStore } from '@/state/AccountStore';
import { useRouter } from 'vue-router';
import { ARTICLE_TEXT_FILENAME } from '@/constants/Articles'
import MaterialIcon from '@/components/MaterialIcon.vue';
import { MdEditor } from 'md-editor-v3';
import ListDeselect from '@/components/ListDeselect.vue';
import 'md-editor-v3/lib/style.css';
import 'vue-select/dist/vue-select.css';


const router = useRouter();

const files = ref([] as File[]);
const name = ref("");
const description = ref("");
const editorContent = ref("");
const categories = ref<string[]>();

const { data: availableCategories } = useQuery({
  queryKey: ["categories"],
  queryFn: () => getArticleCategories()
})

const { mutate: submitArticle } = useMutation({
  mutationFn: async ({ content }: { content: string }) => {
    const id = await postArticle(accountStore.token!, {
      name: name.value,
      description: description.value
    })

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
      postArticleFile(accountStore.token!, id, file)
    }

    for (const category of categories?.value ?? []) {
      patchAssignArticleCategory(accountStore.token!, category, {
        articleId: id,
        order: 0
      })
    }
  },

  onSuccess() {
    router.replace("/sprava/informace");
  }
})

</script>

<template>
  <h1>Nový příspěvek</h1>
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
    language="en-US"
    :no-mermaid="true"
    :no-katex="true"
    :no-highlight="true"
    :no-prettier="true"
    :no-img-zoom-in="true"
    @upload-img="(newFiles) => files.push(...newFiles)"
    @save="(content) => submitArticle({ content })"
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
        Smazat
      </button>
    </li>
  </ul>
</template>
