<route lang="yaml">
meta:
  layout: desktop/side
</route>

<route lang="yaml">
meta:
  layout: desktop/side
</route>

<script setup lang="ts">
import { applicationStore } from '@/state/ApplicationStore';
import { translations } from '@/constants/Translations';
import { requestPushNotifications } from '@/plugins/vue/firebase';
import TranslatedText from '@/components/TranslatedText.vue';
</script>

<template>
  <div class="w-full space-y-6">
    <h1 class="text-2xl font-bold">Nastavení</h1>
    <label for="app-language" class="flex flex-col gap-2">
      <TranslatedText identifier="labels.language" />
      <select id="app-language" v-model="applicationStore.language" class="p-2">
        <option v-for="(language, code) in translations" :key="code" :value="code">
          {{ language.lang_name }}
        </option>
      </select>
    </label>
    <button type="button" class="button-secondary p-2" @click="requestPushNotifications">
      Povolit oznámení v prohlížeči
    </button>
  </div>
</template>
