<script setup lang="ts">
import LogoNoText from "@/assets/logo-no-text.svg";

</script>

<template>
  <div class="flex flex-col items-center gap-y-6 w-full">
    <img :src="LogoNoText" />
    <h1 class="text-center">Nářečí českých strnadů</h1>
    <span class="text-md text-justify [text-align-last:center]">Projekt občanské vědy zaměřený na studium rozmanitosti ptačího zpěvu. Nahráváním zpěvu strnadů obecných po celém Česku můžete přispět k poznání, jak se v krajině udržují ptačí nářečí.</span>

    <router-link to="/" class="button-primary px-2 py-4 w-full">Vstoupit</router-link>

    <!-- <div class="self-start">
      <h2 class="text-xl">Foto týdne</h2>
    </div> -->

    <hr />

    <div class="flex flex-col w-full gap-x-1 gap-y-1">
      <PrefetchLink to="/podporuji-nas" class="button-secondary text-lg p-2 w-full text-center">
        Kdo nás podporuje
      </PrefetchLink>
      <PrefetchLink to="/o-nas" class="button-secondary text-lg p-2 w-full text-center">
        O týmu
      </PrefetchLink>
    </div>

    <span class="font-medium text-justify text-sm text-red-400">
      Aplikace i web stále procházejí velmi bouřlivým vývojem. Za chyby se omlouváme. Těšte se na časté aktualizace a vylepšování.
    </span>
</div>
</template>
