<route lang="yaml">
meta:
  layout: desktop/side
</route>

<template>
  <article class="w-full space-y-4">
    <h1 class="text-2xl font-bold">Jak přispět nahrávkou</h1>
    <ol class="list-decimal space-y-2 pl-6">
      <li>Přihlaste se a otevřete stránku Nahrát.</li>
      <li>Vyberte podporovaný zvukový soubor a ověřte jeho polohu.</li>
      <li>Doplňte datum, čas a základní informace o nahrávce.</li>
      <li>Zkontrolujte souhlas a odešlete nahrávku do fronty.</li>
    </ol>
    <RouterLink to="/mapa/nahrat" class="button-primary inline-block p-3">
      Nahrát záznam
    </RouterLink>
  </article>
</template>
