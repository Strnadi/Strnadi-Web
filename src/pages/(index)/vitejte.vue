<route lang="yaml">
meta:
  layout: desktop/small-popup
</route>

<script setup lang="ts">
import TranslatedText from '@/components/TranslatedText.vue';
import { useRoute } from 'vue-router';

const route = useRoute();
</script>

<template>
  <div class="flex flex-col items-center gap-y-6 w-full">
    <div class="flex flex-row items-center gap-x-10">
      <img src="/WIP.png" width="150px" />
      <div class="flex flex-col">
        <h4>Kontakty</h4>
        <a external="true" href="mailto:info@strnadi.cz" class="text-sm">info@strnadi.cz</a>
        <a external="true" href="mailto:developers@strnadi.cz" class="text-sm"
          >developers@strnadi.cz</a
        >
      </div>
    </div>
    <h1 class="text-center">
      <TranslatedText identifier="project_name" />
    </h1>
    <span class="text-md text-justify [text-align-last:center]"
      ><TranslatedText identifier="project_description"
    /></span>

    <span class="font-bold text-justify text-sm text-red-400">
      <TranslatedText identifier="development" />
    </span>

    <router-link
      :to="
        route.query['from']
          ? decodeURIComponent(route.query['from'] as string)
          : '/'
      "
      class="button-primary px-2 py-4 w-full"
    >
      <TranslatedText identifier="buttons.enter" />
    </router-link>

    <!-- <div class="self-start">
      <h2 class="text-xl">Foto týdne</h2>
    </div> -->

    <hr />

    <div class="flex flex-col w-full gap-x-1 gap-y-1">
      <PrefetchLink
        to="/informace/projekt/projekt-podporuji"
        class="button-secondary text-lg p-2 w-full text-center"
      >
        <TranslatedText identifier="buttons.supporters" />
      </PrefetchLink>
      <PrefetchLink
        to="/informace/projekt/nas-tym"
        class="button-secondary text-lg p-2 w-full text-center"
      >
        <TranslatedText identifier="buttons.about_us" />
      </PrefetchLink>
    </div>
  </div>
</template>
