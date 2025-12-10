<route lang="yaml">
meta:
  layout: mobile/default
</route>

<script setup vapor lang="ts">
import { accountStore } from '@/state/AccountStore';
</script>

<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-6">Propojené účty</h1>

    <div class="space-y-4">
      <p class="text-gray-600 text-sm mb-4">
        Propojte své účty ze sociálních sítí pro rychlejší přihlášení
      </p>

      <div
        class="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center"
          >
            <span class="text-white font-bold">G</span>
          </div>
          <div>
            <p class="font-semibold">Google</p>
            <p class="text-sm text-gray-600">Nepřipojeno</p>
          </div>
        </div>
        <button
          class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
        >
          Připojit
        </button>
      </div>

      <div
        class="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 bg-blue-800 rounded-full flex items-center justify-center"
          >
            <span class="text-white font-bold">F</span>
          </div>
          <div>
            <p class="font-semibold">Facebook</p>
            <p class="text-sm text-gray-600">Nepřipojeno</p>
          </div>
        </div>
        <button
          class="px-4 py-2 bg-blue-800 text-white rounded-lg text-sm font-medium"
        >
          Připojit
        </button>
      </div>

      <div
        class="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 bg-black rounded-full flex items-center justify-center"
          >
            <span class="text-white font-bold">A</span>
          </div>
          <div>
            <p class="font-semibold">Apple</p>
            <p class="text-sm text-gray-600">Nepřipojeno</p>
          </div>
        </div>
        <button
          class="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium"
        >
          Připojit
        </button>
      </div>
    </div>
  </div>
</template>
