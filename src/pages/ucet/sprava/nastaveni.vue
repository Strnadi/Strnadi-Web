<route lang="yaml">
meta:
  layout: mobile/default
</route>

<script setup lang="ts">
import { accountStore } from '@/state/AccountStore';
</script>

<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-6">
      Nastavení
    </h1>

    <div class="space-y-4">
      <div class="border-b border-gray-200 pb-4">
        <h2 class="text-lg font-semibold mb-2">
          Notifikace
        </h2>
        <p class="text-gray-600 text-sm mb-3">
          Spravujte, jaké notifikace chcete dostávat
        </p>
        <label class="flex items-center justify-between py-2">
          <span class="text-base">E-mailové notifikace</span>
          <input
            type="checkbox"
            class="w-5 h-5"
          >
        </label>
      </div>

      <div class="border-b border-gray-200 pb-4">
        <h2 class="text-lg font-semibold mb-2">
          Soukromí
        </h2>
        <p class="text-gray-600 text-sm mb-3">
          Nastavte, kdo může vidět váš profil a nahrávky
        </p>
        <label class="flex items-center justify-between py-2">
          <span class="text-base">Veřejný profil</span>
          <input
            type="checkbox"
            class="w-5 h-5"
            checked
          >
        </label>
      </div>

      <div class="border-b border-gray-200 pb-4">
        <h2 class="text-lg font-semibold mb-2">
          Jazyk
        </h2>
        <p class="text-gray-600 text-sm mb-3">
          Vyberte preferovaný jazyk aplikace
        </p>
        <select class="w-full p-3 border border-gray-300 rounded-lg text-base">
          <option>Čeština</option>
          <option>English</option>
        </select>
      </div>
    </div>
  </div>
</template>
