<route>
meta:
  layout: desktop/side
</route>

<script setup lang="ts">
import { accountStore } from '@/state/AccountStore'
</script>

<template>
  <h1>Můj profil</h1>
  <span class="text-xl font-medium">{{ accountStore.user!.firstName }} {{ accountStore.user!.lastName }}</span>
  <span class="text-lg">{{ accountStore.user!.email }}</span>
  <prefetch-link
    to="/ucet/moje-nahravky"
    class="link"
  >
    Moje nahrávky
  </prefetch-link>
  <prefetch-link
    to="/ucet/osobni-udaje"
    class="link"
  >
    Osobní údaje
  </prefetch-link>
  <prefetch-link
    to="/ucet/oznameni"
    class="link"
  >
    Oznámení
  </prefetch-link>

  <template v-if="!accountStore.user?.isEmailVerified">
    <prefetch-link to="/ucet/overeni-emailu">
      Odeslat znovu ověřovací e-mail
    </prefetch-link>
  </template>

  <prefetch-link
    to="/ucet/sprava/smazat"
    class="p-2"
  >
    <span class="text-red-500">Smazat účet</span>
  </prefetch-link>
</template>

<style scoped>
@reference "../../styles/main.css";

.link {
  @apply flex flex-col justify-center;
  @apply p-2 my-1 border-2 border-gray-300 rounded-lg;
}
</style>
