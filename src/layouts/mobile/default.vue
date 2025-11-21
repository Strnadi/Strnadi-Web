<script setup lang="ts">
import MobileNav from '@/views/nav/MobileNav.vue';
import { useRoute, useRouter } from 'vue-router';

const router = useRouter();
const route = useRoute();

const goBack = () => {
  router.back();
};

const closePopup = () => {
  router.replace('/');
};
</script>

<template>
  <div class="relative flex flex-col h-svh">
    <div
      class="flex flex-col flex-1 overflow-auto"
      :class="route.path !== '/' && 'px-4 py-3 pb-safe'"
    >
      <!-- <div
        v-if="route.path !== '/'"
        class="sticky flex flex-row justify-between top-0 z-10 bg-white/95 backdrop-blur-sm -mx-4 px-4 py-2 mb-2"
      >
        <button
          class="small"
          @click="goBack"
        >
          <Back />
        </button>
        <button
          class="small bg-yellow-300 rounded-2xl"
          @click="closePopup"
        >
          <Close />
        </button>
      </div> -->

      <router-view />
    </div>
    <MobileNav />
  </div>
</template>
