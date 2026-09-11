<route lang="yaml">
meta:
  layout: desktop/small-popup
</route>

<script setup lang="ts"></script>

<template>
  <div class="flex flex-col items-center gap-y-5 text-center">
    <img
      src="/logo-no-text.svg"
      alt="Strnadi"
      class="h-20 w-20"
    />
    <h1>Obnova hesla se přesunula</h1>
    <p>Z bezpečnostních důvodů se heslo obnovuje na přihlašovacím serveru.</p>
    <RouterLink
      to="/ucet/zapomenute-heslo"
      class="button-primary w-full p-3"
    >
      Vyžádat nový odkaz
    </RouterLink>
    <RouterLink
      to="/"
      class="underline"
      >Zpět na úvod</RouterLink
    >
  </div>
</template>
