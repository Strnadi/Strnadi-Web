<script setup lang="ts">
import { useRouter } from 'vue-router';
import Map from '@/components/map/Map.vue';
import Navbar from '@/components/nav/Navbar.vue';

import Back from '@/assets/icon-back.svg';
import MapButtons from '@/components/map/MapButtons.vue';

import { registerStore } from '@/state/RegisterStore';
import { uploadStore } from '@/state/UploadStore';

const router = useRouter();

interface MultiStepStore {
  stage: number;
  prevStage: () => void;
}

const formRegistry: Record<string, MultiStepStore> = {
  '/registrace': registerStore,
  '/nahrat': uploadStore
};

const goBack = () => {
  const currentPath = router.currentRoute.value.path;
  const store = formRegistry[currentPath];

  // Handle multi-step forms
  if (store && store.stage > 0) {
    store.prevStage();
    return;
  }

  // Default back behavior
  router.back();
};
</script>

<template>
  <nav>
    <Navbar />
  </nav>

  <router-view name="side" v-slot="{ Component }">
    <Transition>
      <aside v-if="Component" class="side">
        <div>
          <button @click="router.replace('/')" class="secondary p-2 m-2 self-start flex flex-row items-center">
            <img :src="Back" />
            <span>Zpět</span>
          </button>
          <component :is="Component" />
        </div>
      </aside>
    </Transition>
  </router-view>

  <router-view name="popup" v-slot="{ Component }">
    <Transition>
      <aside v-if="Component" class="popup">
        <div class="w-full md:w-1/2 lg:w-1/3 max-h-[90vh] lg:max-h-[80vh] flex flex-col bg-white/95 backdrop-blur-md rounded-lg overflow-y-auto p-8">
          <button @click="goBack" class="secondary p-2 self-start flex flex-row items-center">
            <img :src="Back" />
            <span>Zpět</span>
          </button>
          <div class="w-full">
            <component :is="Component" />
          </div>
        </div>
      </aside>
    </Transition>
  </router-view>

  <router-view name="center" v-slot="{ Component }">
    <Transition>
      <aside v-if="Component" class="center">
        <div class="flex flex-col gap-x-2 gap-y-4 overflow-y-auto max-h-[90vh] lg:max-h-[80vh] max-w-fit min-w-0 items-center p-8">
          <button @click="goBack" class="secondary p-2 self-start flex flex-row items-center">
            <img :src="Back" />
            <span>Zpět</span>
          </button>
          <div class="max-w-fit flex flex-col gap-y-2">
            <component :is="Component" />
          </div>
        </div>
      </aside>
    </Transition>
  </router-view>

  <main>
    <Map class="w-screen h-screen" />
    <div class="absolute bottom-0 right-0 z-[calc(1e6)] flex flex-col justify-end">
      <MapButtons />
    </div>
  </main>
</template>

<style scoped>
  @reference "./main.css";

  nav {
    @apply fixed z-[calc(1e9)] drop-shadow-xl min-w-0 w-full;
  }

  aside.popup {
    @apply fixed inset-0 flex items-center justify-center bg-black/50 z-[calc(1e10)];
  }

  aside.side {
    @apply drop-shadow-lg;
    @apply fixed;
    @apply mt-20;
    @apply lg:mt-30;
    @apply sm:mx-5;
    @apply top-0;
    @apply min-w-0;
    @apply sm:w-1/2;
    @apply xl:w-1/3;
    @apply z-[calc(1e7)];
    @apply flex;
    @apply flex-col;
    @apply bg-white/95;
    @apply backdrop-blur-md;
    @apply rounded-lg;
  }

  aside.side > div {
    @apply grid;
    @apply grid-cols-[auto_1fr];
    @apply overflow-y-auto;
    @apply max-h-[90vh];
    @apply lg:max-h-[80vh];
    @apply rounded-4xl;
    @apply p-8;
    @apply items-center;
  }

  aside.side > div > :not(h1, button) {
    @apply col-span-2;
  }

  aside.center {
    @apply drop-shadow-lg;
    @apply fixed;
    @apply mt-20;
    @apply lg:mt-30;
    @apply top-0;
    @apply left-0;
    @apply right-0;
    @apply mx-auto;
    @apply w-fit;
    @apply max-w-full;
    @apply z-[calc(1e7)];
    @apply bg-white/95;
    @apply backdrop-blur-md;
    @apply rounded-lg;
  }

  .v-enter-active,
  .v-leave-active {
    transition: opacity 0.15s ease-out;
  }

  .v-enter-from,
  .v-leave-to {
    opacity: 0;
  }
</style>
