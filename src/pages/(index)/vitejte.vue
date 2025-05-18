<route>
meta:
  layout: desktop/small-popup
</route>

<script setup lang="ts">
import { useRoute } from 'vue-router';

const route = useRoute();
</script>

<template>
  <div class="flex flex-col items-center gap-y-6 w-full">
    <img src="/logo-no-text.svg">
    <h1 class="text-center">
      Nářečí českých strnadů
    </h1>
    <span class="text-md text-justify [text-align-last:center]">Projekt občanské vědy zaměřený na studium rozmanitosti ptačího zpěvu. Nahráváním zpěvu strnadů obecných po celém Česku můžete přispět k poznání, jak se v krajině udržují ptačí nářečí.</span>

    <router-link
      :to="route.query.from ? route.query.from : '/'"
      class="button-primary px-2 py-4 w-full"
    >
      Vstoupit
    </router-link>

    <!-- <div class="self-start">
      <h2 class="text-xl">Foto týdne</h2>
    </div> -->

    <hr>

    <div class="flex flex-col w-full gap-x-1 gap-y-1">
      <PrefetchLink
        to="/informace/projekt/podporovatele"
        class="button-secondary text-lg p-2 w-full text-center"
      >
        Kdo nás podporuje
      </PrefetchLink>
      <PrefetchLink
        to="/informace/projekt/nas-tym"
        class="button-secondary text-lg p-2 w-full text-center"
      >
        O týmu
      </PrefetchLink>
    </div>

    <span class="font-bold text-justify text-sm text-red-400">
      Web i aplikace stále procházejí velmi bouřlivým vývojem. Za chyby se omlouváme. Těšte se na časté aktualizace a vylepšování.
    </span>

    <h2 class="self-start">
      Kontakty
    </h2>
    <div class="flex flex-row gap-x-4">
      <a
        external="true"
        href="mailto:info@strnadi.cz"
      >info@strnadi.cz</a>
      <a
        external="true"
        href="mailto:developers@strnadi.cz"
      >developers@strnadi.cz</a>
    </div>
  </div>
</template>
