<route lang="yaml">
meta:
  layout: desktop/side
</route>

<script setup lang="ts">
import TranslatedText from '@/components/TranslatedText.vue';
</script>

<template>
  <h1>
    <TranslatedText identifier="admin.dashboard.title" />
  </h1>

  <div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
    <RouterLink
      to="/sprava/uzivatele"
      class="group flex aspect-square items-center justify-center rounded-2xl border border-gray-200 bg-white p-3 text-center text-lg font-semibold shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      <TranslatedText identifier="admin.dashboard.users" />
    </RouterLink>
    <RouterLink
      to="/sprava/informace"
      class="group flex aspect-square items-center justify-center rounded-2xl border border-gray-200 bg-white p-3 text-center text-lg font-semibold shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      <TranslatedText identifier="admin.dashboard.articles" />
    </RouterLink>
    <RouterLink
      to="/sprava/vsechny-nahravky"
      class="group flex aspect-square items-center justify-center rounded-2xl border border-gray-200 bg-white p-3 text-center text-lg font-semibold shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      <TranslatedText identifier="admin.dashboard.recordings" />
    </RouterLink>
    <RouterLink
      to="/sprava/oznameni"
      class="group flex aspect-square items-center justify-center rounded-2xl border border-gray-200 bg-white p-3 text-center text-lg font-semibold shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      <TranslatedText identifier="admin.notifications.title" />
    </RouterLink>
    <RouterLink
      to="/sprava/odmeny"
      class="group flex aspect-square items-center justify-center rounded-2xl border border-gray-200 bg-white p-3 text-center text-lg font-semibold shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      <TranslatedText identifier="admin.dashboard.awards" />
    </RouterLink>
    <RouterLink
      to="/sprava/uspechy"
      class="group flex aspect-square items-center justify-center rounded-2xl border border-gray-200 bg-white p-3 text-center text-lg font-semibold shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      <TranslatedText identifier="admin.dashboard.achievments" />
    </RouterLink>
    <RouterLink
      to="/sprava/potvrzeni-dialektu"
      class="group flex aspect-square items-center justify-center rounded-2xl border border-gray-200 bg-white p-3 text-center text-lg font-semibold shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      <TranslatedText identifier="admin.dashboard.confirmation" />
    </RouterLink>
  </div>
</template>
