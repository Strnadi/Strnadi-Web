<script setup lang="ts">
import Close from "@/icons/interface/icon-close.svg";
import { useRouter } from 'vue-router';

const router = useRouter();

const goBack = () => {
  router.back();
}

const closePopup = () => {
  router.replace("/");
}

</script>

<template>
  <router-view v-slot="{ Component }">
    <aside class="side">
      <div v-auto-scrollbar class="relative">
        <div class="sticky flex flex-row-reverse justify-between top-0">
          <button
            class="small bg-yellow-300 rounded-2xl"
            @click="closePopup"
          >
            <Close />
          </button>
        </div>

        <component :is="Component" />
      </div>
      <div class="bottom-fade" />
    </aside>
  </router-view>
</template>

<style scoped>
  @reference "../../styles/main.css";

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

  aside > div {
    @apply /*grid grid-cols-[auto_1fr] */ overflow-y-auto max-h-[90vh] desktop:max-h-[80vh] items-center;
    @apply rounded-4xl;
    @apply p-8;
    @apply pb-20;
    @apply wrap-anywhere;
    @apply pr-[24px];
    @apply bg-white/90;
    @apply gap-y-2;
    @apply relative;
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

  .bottom-fade {
    pointer-events: none;
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 7rem;
    background: linear-gradient(
      to bottom,
      rgba(255,255,255,0) 0%,
      rgba(255,255,255,1) 100%
    );
  }
</style>
