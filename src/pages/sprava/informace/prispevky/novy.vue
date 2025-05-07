<route>
meta:
  layout: desktop/center
</route>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useMutation } from '@tanstack/vue-query';
import { postArticle, postArticleFile } from '@/api/articles';
import { accountStore } from '@/state/AccountStore';
import { useRouter } from 'vue-router';
import { ARTICLE_TEXT_FILENAME } from '@/constants/Articles'
import MaterialIcon from '@/components/MaterialIcon.vue';
import { MdEditor } from 'md-editor-v3';
import 'md-editor-v3/lib/style.css';


const router = useRouter();

const files = ref([] as File[]);
const name = ref("");
const description = ref("");
const editorContent = ref("");

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
  },

  onSuccess() {
    router.replace("/sprava/informace");
  }
})

</script>

<template>
  <h1>Nový příspěvek</h1>
  <input v-model="name" type="text" placeholder="Nadpis" />
  <input v-model="description" type="text" placeholder="Popisek" />
  <MdEditor
    v-model="editorContent"
    language="en-US"
    @upload-img="(newFiles) => files.push(...newFiles)"
    @save="(content) => submitArticle({ content })"
    :no-mermaid="true"
    :no-katex="true"
    :no-highlight="true"
    :no-prettier="true"
    :no-img-zoom-in="true"
  />

  <ul class="flex flex-col w-full" @click.stop>
    <li v-for="file in files" :key="file.name" class="flex flex-row w-full items-center justify-between">
      <MaterialIcon class="h-10" :filename="file.name" />
      <div class="flex flex-col">
        <p>{{ file.name }}</p>
        <p>{{ file.size / 1_000_000 }} MB</p>
      </div>
      <button class="text-red-500" @click="files.splice(files.indexOf(file), 1)">Smazat</button>
    </li>
  </ul>
</template>
