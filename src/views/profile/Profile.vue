<script setup lang="ts">
import { accountStore } from '@/state/AccountStore';

</script>

<template>
  <h1>Můj profil</h1>
  <span>{{ accountStore.user!.firstName }} {{ accountStore.user!.lastName }}</span>
  <span>{{ accountStore.user!.email }}</span>
  <prefetch-link to="/ucet/moje-nahravky" class="link">
    Moje nahrávky
  </prefetch-link>
  <prefetch-link to="/ucet/osobni-udaje" class="link">
    Osobní údaje
  </prefetch-link>
  <prefetch-link to="/ucet/oznameni" class="link">
    Oznámení
  </prefetch-link>
</template>

<style scoped>

@reference "../../styling/main.css";

.link {
  @apply flex flex-col justify-center;
  @apply p-2 my-1 border-2 border-gray-300 rounded-lg;
}

</style>
