<script setup lang="ts">
import LogoNoText from "@/assets/logo-no-text.svg";

</script>

<template>
  <div class="flex flex-col items-center gap-y-4 w-full">
    <img :src="LogoNoText" />
    <h1 class="text-center">Nářečí českých strnadů</h1>
    <span class="text-xl font-bold text-center">Nahrávejte, mapujte, dobývejte</span>

    <div>
      <h2>Varování</h2>
      <span class="font-medium text-center">
        Aplikace i web jsou stále ve velmi aktivním vývoji - v betě - a tak,
        s prosbou o pochopení, se mohou různě naskytnout menší či větší problémy.
      </span>
    </div>

    <div class="self-start">
      <h2 class="text-xl">Foto týdne</h2>
      <!-- <img> -->
    </div>

    <div class="flex flex-row w-full gap-x-1">
      <PrefetchLink to="/o-nas" class="button-secondary text-lg p-2 w-full text-center">
        O týmu
      </PrefetchLink>
      <PrefetchLink to="/podporuji-nas" class="button-secondary text-lg p-2 w-full text-center">
        Kdo nás podporuje
      </PrefetchLink>
    </div>
  </div>
</template>
