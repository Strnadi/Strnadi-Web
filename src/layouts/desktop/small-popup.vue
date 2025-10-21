<script setup lang="ts">
import { useRouter } from 'vue-router';
import TranslatedText from '@/components/TranslatedText.vue';
import Close from '@/icons/interface/icon-close.svg';

const router = useRouter();
const closePopup = () => {
  router.push('/');
};
</script>

<template>
  <router-view v-slot="{ Component, route }">
    <aside class="small_popup" @click="closePopup" @keydown.escape="closePopup">
      <div :key="`${route.path}`" @click.stop v-auto-scrollbar class="relative">
        <button
          class="small absolute top-5 right-5 z-10 bg-yellow-300 rounded-2xl"
          @click="closePopup"
        >
          <Close />
        </button>

        <component :is="Component" />
      </div>
    </aside>
  </router-view>
</template>

<style scoped>
@reference "../../styles/main.css";

aside.small_popup {
  @apply fixed inset-0 flex items-center justify-center bg-black/50 z-[10];
  @apply backdrop-blur-sm;
}

aside.small_popup > div {
  @apply w-fit;
  @apply max-w-full sm:max-w-2/3 md:max-w-1/2 lg:max-w-1/3 desktop:max-w-1/4;
}

aside > div {
  @apply /* grid grid-cols-[auto_1fr] */ overflow-y-auto max-h-[90vh] desktop:max-h-[80vh] items-center;
  @apply rounded-4xl;
  @apply p-8;
  @apply bg-white/90;
}

aside > div > div > button.small {
  @apply py-1 mr-4 self-start flex flex-row items-center border-none;
}

aside > div > div > button.big {
  @apply py-1 -ml-3 mr-4 self-start flex flex-row items-center border-none;
}

aside > div :not(div:first-of-type, h1:first-of-type, div:first-of-type) {
  @apply col-span-2;
}
</style>
