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
  '/ucet/registrace': registerStore,
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

const maybeGoBack = (event: KeyboardEvent) => {
  if (event.key === "Escape") { // fixed key check
    goBack();
  }
}
</script>

<template>
  <nav>
    <Navbar />
  </nav>

  <router-view name="side" v-slot="{ Component }">
    <Transition>
      <aside v-if="Component" class="side">
        <div>
          <button class="secondary" @click="goBack">
            <img :src="Back" />
            <span>Zpět</span>
          </button>
          <component :is="Component" />
        </div>
      </aside>
    </Transition>
  </router-view>

  <router-view name="popup" v-slot="{ Component, route }">
    <Transition>
      <aside v-if="Component" class="popup">
        <Transition name="fade" mode="out-in">
          <div :key="`${route.path}-${formRegistry[route.path]?.stage}`">
            <button class="secondary" @click="goBack" @keydown="maybeGoBack">
              <img :src="Back" />
              <span>Zpět</span>
            </button>
            <component :is="Component" />
          </div>
        </Transition>
      </aside>
    </Transition>
  </router-view>

  <router-view name="center" v-slot="{ Component }">
    <Transition>
      <aside v-if="Component" class="center">
        <div>
          <button class="secondary" @click="goBack">
            <img :src="Back" />
            <span>Zpět</span>
          </button>
          <component :is="Component" />
        </div>
      </aside>
    </Transition>
  </router-view>

  <main>
    <Map class="w-screen h-screen" />
    <div class="absolute bottom-0 right-0 z-[6] flex flex-col justify-end">
      <MapButtons />
    </div>
  </main>
</template>

<style scoped>
  @reference "../styling/main.css";

  nav {
    @apply fixed z-[9] drop-shadow-xl min-w-0 w-full;
  }

  aside.popup {
    @apply fixed inset-0 flex items-center justify-center bg-black/50 z-[10];
    @apply backdrop-blur-sm;
  }

  aside.side {
    @apply drop-shadow-lg;
    @apply fixed;
    @apply top-20;
    @apply desktop:top-30;
    @apply sm:left-5;
    @apply sm:right-5;
    @apply min-w-0;
    @apply sm:w-1/2;
    @apply xl:w-1/3;
    @apply z-[7];
    @apply rounded-lg;
  }

  aside.center {
    @apply drop-shadow-lg;
    @apply fixed;
    @apply mt-20;
    @apply desktop:mt-30;
    @apply top-0;
    @apply left-0;
    @apply right-0;
    @apply mx-auto;
    @apply w-fit;
    @apply desktop:max-w-3/4;
    @apply z-[7];
    @apply rounded-lg;
  }

  aside > div {
    @apply grid grid-cols-[auto_1fr] overflow-y-auto max-h-[90vh] desktop:max-h-[80vh] items-center;
    @apply rounded-4xl;
    @apply p-8;
    @apply bg-white/95;
  }

  aside > div > button {
    @apply px-2 py-1 mx-2 self-start flex flex-row items-center;
  }

  aside > div :not(button:first-of-type, h1:first-of-type) {
    @apply col-span-2;
  }

  .v-enter-active,
  .v-leave-active {
    transition: opacity 0.15s ease-out;
  }

  .v-enter-from,
  .v-leave-to {
    opacity: 0;
  }

  .fade-enter-active,
  .fade-leave-active {
    transition: all 0.25s ease;
  }

  .fade-enter-from,
  .fade-leave-to {
    height: 0;
    padding: 0;
    margin: 0;
  }
</style>
