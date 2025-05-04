<script setup lang="ts">
import { ref, computed } from 'vue';
import { accountStore } from '@/state/AccountStore';

import MapIcon from '@/icons/interface/icon-map.svg';
import AccountIcon from '@/icons/interface/icon-profile.svg';
import UploadIcon from '@/icons/interface/icon-upload.svg';
import ListIcon from '@/icons/interface/icon-list.svg';

const isMenuOpen = ref(false);

</script>

<template>
  <nav class="flex flex-row w-full h-16 bg-white">
    <prefetch-link
      v-wave
      to="/"
      class="flex justify-center flex-1 h-full"
    >
      <img :src="MapIcon" />
    </prefetch-link>

    <prefetch-link
      v-wave
      v-if="accountStore.user"
      to="/ucet/sprava/moje-nahravky"
      class="flex justify-center flex-1 h-full"
    >
      <img :src="ListIcon" />
    </prefetch-link>

    <prefetch-link
      v-wave
      to="/nahrat"
      class="flex justify-center flex-1 h-full"
    >
      <img :src="UploadIcon" />
    </prefetch-link>

    <prefetch-link v-wave class="flex justify-center flex-1 h-full">
      <img :src="AccountIcon" />
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
