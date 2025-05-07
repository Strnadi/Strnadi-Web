<script setup lang="ts">
import { accountStore } from '@/state/AccountStore';

import MapIcon from '@/icons/interface/icon-map.svg';
import AccountIcon from '@/icons/interface/icon-profile.svg';
import UploadIcon from '@/icons/interface/icon-upload.svg';
import ListIcon from '@/icons/interface/icon-list.svg';
import InfoIcon from '@/icons/interface/icon-info.svg';

</script>

<template>
  <nav class="sticky bottom-0 flex flex-row justify-evenly w-full h-16 bg-white">

    <prefetch-link
      v-wave
      to="/"
      class="flex flex-1 justify-center items-center"
      :class="{ 'bg-gray-100': $route.path === '/' }"
    >
      <MapIcon />
    </prefetch-link>

    <prefetch-link
      v-wave
      v-if="accountStore.user"
      to="/informace"
      class="flex flex-1 justify-center items-center"
      :class="{ 'bg-gray-100': $route.path.startsWith('/informace') }"
    >
      <InfoIcon />
    </prefetch-link>

    <prefetch-link
      v-wave
      v-if="accountStore.user"
      to="/ucet/sprava/moje-nahravky"
      class="flex flex-1 justify-center items-center"
      :class="{ 'bg-gray-100': $route.path.startsWith('/ucet/sprava/moje-nahravky') }"
    >
      <ListIcon />
    </prefetch-link>

    <prefetch-link
      v-wave
      to="/nahrat"
      class="flex flex-1 justify-center items-center"
      :class="{ 'bg-gray-100': $route.path.startsWith('/nahrat') }"
    >
      <UploadIcon />
    </prefetch-link>

    <prefetch-link
      v-wave
      :to="accountStore.user ? '/ucet/sprava/osobni-udaje' : '/ucet/vitejte'"
      class="flex flex-1 justify-center items-center"
      :class="{ 'bg-gray-100': $route.path.startsWith('/ucet') }"
    >
      <AccountIcon />
    </prefetch-link>
  </nav>
</template>

<style scoped>

@reference "../../styles/main.css";

:deep(.dropdown-item) {
  @apply font-semibold flex flex-row items-center gap-x-1 px-5 py-2 hover:bg-gray-100 hover:border-0 rounded-xl;
}

nav {
  @apply z-[9] drop-shadow-xl min-w-0 w-full;
}

</style>
