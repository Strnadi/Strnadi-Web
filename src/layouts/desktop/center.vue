<script setup vapor lang="ts">
import Close from '@/icons/interface/icon-close.svg';
import Back from '@/icons/interface/icon-back.svg';
import { useRouter } from 'vue-router';

const router = useRouter();

const goBack = () => {
  router.back();
};

const closePopup = () => {
  router.replace('/');
};
</script>

<template>
  <router-view v-slot="{ Component }">
    <Transition>
      <aside class="center" @keydown.escape="closePopup">
        <button
          class="small absolute top-5 left-5 z-10 rounded-2xl"
          @click="goBack"
        >
          <Back />
        </button>

        <button
          class="small absolute top-5 right-5 z-10 bg-yellow-300 rounded-2xl"
          @click="closePopup"
        >
          <Close />
        </button>

        <div>
          <component :is="Component" />
        </div>
      </aside>
    </Transition>
  </router-view>
</template>

<style scoped>
@reference "../../styles/main.css";

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
  @apply min-w-fit;
  @apply max-w-full;
  /* @apply desktop:max-w-3/4; */
  @apply z-[7];
  @apply rounded-lg;
  @apply backdrop-blur-3xl;
}

aside > div {
  @apply /* grid grid-cols-[auto_1fr] */ overflow-y-auto max-h-[90vh] desktop:max-h-[80vh] items-center;
  @apply rounded-4xl;
  @apply p-8;
  @apply bg-white/90;
}

aside > div > div > button.small {
  @apply py-1 mr-4 self-start flex flex-row items-center border-none bg-transparent;
}

aside > div > div > button.big {
  @apply py-1 -ml-3 mr-4 self-start flex flex-row items-center border-none bg-transparent;
}

/* aside > div :not(button:first-of-type, h1:first-of-type) {
  @apply col-span-2;
} */
</style>
