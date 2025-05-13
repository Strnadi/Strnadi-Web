<route>
meta:
  layout: desktop/popup
</route>

<script setup lang="ts">
import HorizontalLineWithText from "@/components/HorizontalLineWithText.vue";
</script>

<template>
  <div class="flex flex-col items-center gap-y-6 w-full">
    <img src="/logo-no-text.svg">
    <h1 class="text-center">
      Nářečí českých strnadů
    </h1>
    <span class="text-xl text-center">Projekt občanské vědy</span>

    <div class="flex flex-col items-center gap-y-2 w-full">
      <PrefetchLink
        :replace="true"
        to="/ucet/registrace"
        class="button-primary p-2 w-full"
      >
        Založit účet
      </PrefetchLink>
      <PrefetchLink
        :replace="true"
        to="/ucet/prihlaseni"
        class="button-secondary p-2 w-full"
      >
        Přihlásit se
      </PrefetchLink>
    </div>

    <HorizontalLineWithText>
      <span class="text-sm text-gray-500">Nebo</span>
    </HorizontalLineWithText>

    <router-link
      to="/"
      class="p-2"
    >
      Pokračovat bez účtu
    </router-link>
  </div>
</template>
