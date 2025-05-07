<route>
meta:
  layout: desktop/side
</route>

<template>
  <h1>Administrátorský panel</h1>

  <div class="flex flex-col gap-y-2">
    <router-link to="/sprava/uzivatele" class="button-secondary p-2 w-full">
      Seznam uživatelů
    </router-link>
    <router-link to="/sprava/informace" class="button-secondary p-2 w-full">
      Správa příspěvků
    </router-link>
    <router-link to="/sprava/vsechny-nahravky" class="button-secondary p-2 w-full">
      Všechny nahrávky
    </router-link>
  </div>
</template>
