<route lang="yaml">
meta:
  layout: mobile/default
</route>

<script setup vapor lang="ts">

import { applicationStore } from '@/state/ApplicationStore';
import { translations } from '@/constants/Translations';
import { requestPushNotifications } from '@/plugins/vue/firebase';
</script>

<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-6">Nastavení</h1>

    <div class="space-y-4">
      <div class="border-b border-gray-200 pb-4">
        <h2 class="text-lg font-semibold mb-2">Notifikace</h2>
        <p class="text-gray-600 text-sm mb-3">
          Spravujte, jaké notifikace chcete dostávat
        </p>
        <button type="button" class="button-secondary p-2" @click="requestPushNotifications">
          Povolit oznámení v prohlížeči
        </button>
      </div>

      <div class="border-b border-gray-200 pb-4">
        <h2 class="text-lg font-semibold mb-2">Jazyk</h2>
        <p class="text-gray-600 text-sm mb-3">
          Vyberte preferovaný jazyk aplikace
        </p>
        <select v-model="applicationStore.language" class="w-full p-3 border border-gray-300 rounded-lg text-base">
          <option v-for="(language, code) in translations" :key="code" :value="code">
            {{ language.lang_name }}
          </option>
        </select>
      </div>
    </div>
  </div>
</template>
