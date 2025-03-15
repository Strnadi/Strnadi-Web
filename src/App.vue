<script setup lang="ts">
import { useRouter } from 'vue-router';
import Map from './components/map/Map.vue';
import Navbar from './components/nav/Navbar.vue';

import Back from './assets/icon-back.svg';
import MapControls from './components/map/MapButtons.vue';

import { registerStore } from '@/state/RegisterStore';
import { uploadStore } from './state/UploadStore';

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
    <aside v-if="Component" class="side">
      <div class="flex flex-col gap-x-2 gap-y-4 overflow-y-auto max-h-[80vh] rounded-4xl p-8">
        <button @click="router.replace('/')" class="secondary p-2 self-start flex flex-row items-center"><img :src="Back" class="inline" /><span>Zpět</span></button>
        <div>
          <component :is="Component" />
        </div>
      </div>
    </aside>
  </router-view>

  <router-view name="popup" v-slot="{ Component }">
    <aside v-if="Component" class="popup">
      <div class="w-full md:w-1/2 lg:w-1/3 max-h-[80vh] flex flex-col bg-white/95 backdrop-blur-md rounded-lg overflow-y-auto p-8">
        <button @click="goBack" class="secondary p-2 self-start flex flex-row items-center"><img :src="Back" class="inline" /><span>Zpět</span></button>
        <div class="w-full">
          <component :is="Component" />
        </div>
      </div>
    </aside>
  </router-view>

  <router-view name="center" v-slot="{ Component }">
    <aside v-if="Component" class="center">
      <div class="flex flex-col gap-x-2 gap-y-4 overflow-y-auto max-h-[85vh] p-8">
        <button @click="router.back" class="secondary p-2 self-start flex flex-row items-center"><img :src="Back" class="inline" /><span>Zpět</span></button>
        <div>
          <component :is="Component" />
        </div>
      </div>
    </aside>
  </router-view>

  <main>
    <Map class="w-screen h-screen" />
    <div class="absolute bottom-0 right-0 z-[calc(1e8)] flex flex-col justify-end">
      <MapControls />
    </div>
  </main>
</template>

<style scoped>
  @reference "./main.css";

  nav {
    @apply fixed z-[calc(1e9)] drop-shadow-xl w-full;
  }

  aside.side {
    @apply drop-shadow-lg;
    @apply fixed;
    @apply mt-30;
    @apply mx-5;
    @apply top-0;
    @apply sm:w-1/2;
    @apply lg:w-1/3;
    @apply z-[calc(1e7)];
    @apply flex;
    @apply flex-col;
    @apply bg-white/95;
    @apply backdrop-blur-md;
    @apply rounded-lg;
  }

  aside.popup {
    @apply fixed inset-0 flex items-center justify-center bg-black/50 z-[calc(1e10)];
  }

  aside.center {
    @apply drop-shadow-lg fixed mt-30 top-0 left-0 right-0 mx-auto w-full sm:w-1/2 lg:w-1/3 z-[calc(1e7)] flex flex-col bg-white/95 backdrop-blur-md rounded-lg;
  }
</style>
