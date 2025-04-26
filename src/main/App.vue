<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import Map from '@/components/map/Map.vue';
import Navbar from '@/components/nav/Navbar.vue';

import Back from '@/assets/icon-back.svg';

import { registerStore } from '@/state/RegisterStore';
import { uploadStore } from '@/state/UploadStore';
import { accountStore } from '@/state/AccountStore';
import Notification from '@/components/generic/Notification.vue';
import { notificationStore } from '@/state/NotificationStore';
import { ref, watch } from 'vue';

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
  if (event.key === "Escape") {
    goBack();
  }
}

const closePopup = () => {
  router.replace('/');
}

watch(() => accountStore.user, (newValue) => {
  if(!newValue) {
    notificationStore.notifications = [];
  } else {
    if(!newValue.isEmailVerified) {
      notificationStore.notifications.push({
        kind: 'info',
        title: 'Ověření účtu',
        message: 'Nemáte dosud ověřený e-mail. Dokud si e-mail neověříte, nemůžete nahrávat a funkcionalita aplikace bude omezená.'
      });
    }
  }
});

</script>

<template>
  <nav>
    <Navbar />
  </nav>

  <aside class="notifications" v-if="notificationStore.notifications.length">
    <ul class="flex flex-col-reverse gap-y-2">
      <li
        v-for="(notification, index) in notificationStore.notifications"
        :key="index"
      >
        <Notification
          :kind="notification.kind"
          :title="notification.title"
          :message="notification.message"
          @dismiss="notificationStore.notifications.splice(index, 1)"
        />
      </li>
    </ul>
  </aside>

  <Map class="w-svw h-svh" />

  <router-view name="side" v-slot="{ Component }">
    <Transition>
      <aside v-if="Component" class="side">
        <div>
          <button class="secondary small" @click="goBack">
            <img :src="Back" />
          </button>
          <component :is="Component" />
        </div>
      </aside>
    </Transition>
  </router-view>

  <router-view name="popup" v-slot="{ Component, route }">
    <Transition>
      <aside v-if="Component" class="popup" @click="closePopup" @keydown="maybeGoBack">
        <Transition name="fade" mode="out-in">
          <div :key="`${route.path}-${formRegistry[route.path]?.stage}`" @click.stop>
            <button class="secondary big" @click="goBack">
              <img :src="Back" />
              <span>Zpět</span>
            </button>
            <component :is="Component" />
          </div>
        </Transition>
      </aside>
    </Transition>
  </router-view>

  <router-view name="small_popup" v-slot="{ Component, route }">
    <Transition>
      <aside v-if="Component" class="small_popup" @click="closePopup" @keydown="maybeGoBack">
        <Transition name="fade" mode="out-in">
          <div :key="`${route.path}`" @click.stop>
            <button class="secondary big" @click="goBack">
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
      <aside v-if="Component" class="center" @keydown="maybeGoBack">
        <div>
          <button class="secondary small" @click="goBack">
            <img :src="Back" />
          </button>
          <component :is="Component" />
        </div>
      </aside>
    </Transition>
  </router-view>
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

  aside.small_popup {
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
    @apply w-full;
    @apply sm:w-1/2;
    @apply xl:w-1/3;
    @apply z-[7];
    @apply rounded-lg;
    @apply backdrop-blur-3xl;
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
    @apply backdrop-blur-3xl;
  }

  aside.notifications {
    @apply fixed;
    @apply top-20;
    @apply desktop:top-30;
    @apply right-5;
    @apply z-[6];
  }

  aside > div, .notifications > ul {
    @apply grid grid-cols-[auto_1fr] overflow-y-auto max-h-[90vh] desktop:max-h-[80vh] items-center;
    @apply rounded-4xl;
    @apply p-8;
    @apply bg-white/90;
  }

  aside.popup > div {
    @apply w-fit;
    @apply desktop:max-w-1/3;
  }

  aside.small_popup > div {
    @apply w-fit;
    @apply max-w-full sm:max-w-2/3 md:max-w-1/2 lg:max-w-1/3 desktop:max-w-1/4;
  }

  aside > div > button.small {
    @apply py-1 mr-4 self-start flex flex-row items-center border-none bg-transparent;
  }

  aside > div > button.big {
    @apply py-1 -ml-3 mr-4 self-start flex flex-row items-center border-none bg-transparent;
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
