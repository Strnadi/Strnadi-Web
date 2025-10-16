<script setup lang="ts">
import Back from '@/icons/interface/icon-back.svg';
import TranslatedText from '@/components/TranslatedText.vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const closePopup = () => {
  router.push("/");
}


</script>

<template>
  <aside
      class="popup"
      @click="closePopup"
      @keydown.escape="closePopup"
  >
    <slot />
  </aside>
</template>

<style scoped>
@reference "../../styles/main.css";

aside.popup {
  @apply fixed inset-0 flex items-center justify-center bg-black/50 z-[10];
  @apply backdrop-blur-sm;
}

aside.popup > div {
  @apply w-fit;
  @apply desktop:max-w-1/3;
}

aside > div {
  @apply grid grid-cols-[auto_1fr] overflow-y-auto max-h-[90vh] desktop:max-h-[80vh] items-center;
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

aside > div :not(div:first-of-type, h1:first-of-type, div:first-of-type) {
  @apply col-span-2;
}
</style>
