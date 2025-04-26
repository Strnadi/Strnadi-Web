<template>
  <h1>Administrátorský panel</h1>

  <div class="flex flex-col gap-y-2">
    <router-link to="/admin/uzivatele" class="button-secondary p-2 w-full">
      Seznam uživatelů
    </router-link>
    <router-link to="/admin/vsechny-nahravky" class="button-secondary p-2 w-full">
      Všechny nahrávky
    </router-link>
  </div>
</template>