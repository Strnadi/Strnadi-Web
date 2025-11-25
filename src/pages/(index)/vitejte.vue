<route lang="yaml">
meta:
  layout: desktop/small-popup
</route>

<script setup vapor lang="ts">
import TranslatedText from '@/components/TranslatedText.vue';
import { useRoute } from 'vue-router';

const route = useRoute();
</script>

<template>
  <div class="flex flex-col items-center gap-y-4 sm:gap-y-6 w-full">
    <div class="flex flex-col sm:flex-row items-center gap-y-3 gap-x-10">
      <img src="/WIP.png" class="w-32 sm:w-36" />
      <div class="flex flex-col text-center sm:text-left">
        <h4 class="text-sm sm:text-base">
          <TranslatedText identifier="buttons.contacts" />
        </h4>
        <a
          external="true"
          href="mailto:info@strnadi.cz"
          class="text-xs sm:text-sm break-all"
          >info@strnadi.cz</a
        >
        <a
          external="true"
          href="mailto:developers@strnadi.cz"
          class="text-xs sm:text-sm break-all"
          >developers@strnadi.cz</a
        >
      </div>
    </div>
    <h1 class="text-center text-xl sm:text-2xl">
      <TranslatedText identifier="project_name" />
    </h1>
    <span class="text-sm sm:text-base text-justify [text-align-last:center]"
      ><TranslatedText identifier="project_description"
    /></span>

    <span class="font-bold text-justify text-xs sm:text-sm text-red-400">
      <TranslatedText identifier="development" />
    </span>

    <router-link
      :to="
        route.query['from']
          ? decodeURIComponent(route.query['from'] as string)
          : '/'
      "
      class="button-primary py-3 px-4 sm:py-4 w-full text-sm sm:text-base touch-manipulation"
    >
      <TranslatedText identifier="buttons.enter" />
    </router-link>

    <!-- <div class="self-start">
      <h2 class="text-xl">Photo of the Week</h2>
    </div> -->

    <hr class="w-full" />

    <div class="flex flex-col w-full gap-y-2">
      <PrefetchLink
        to="/informace/projekt/projekt-podporuji"
        class="button-secondary text-sm sm:text-base py-3 px-4 w-full text-center touch-manipulation"
      >
        <TranslatedText identifier="buttons.supporters" />
      </PrefetchLink>
      <PrefetchLink
        to="/informace/projekt/nas-tym"
        class="button-secondary text-sm sm:text-base py-3 px-4 w-full text-center touch-manipulation"
      >
        <TranslatedText identifier="buttons.about_us" />
      </PrefetchLink>
    </div>
  </div>
</template>
