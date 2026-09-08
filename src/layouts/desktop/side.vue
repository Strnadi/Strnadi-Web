<script setup lang="ts">
import { useRouter } from 'vue-router';
import { t } from '@/components/TranslatedText.vue';

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
    <aside class="side relative">
      <button class="side-control side-control--back" type="button" :aria-label="t('mobile.shell.back')" @click="goBack">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6-6 6 6 6" /></svg>
      </button>

      <button class="side-control side-control--close" type="button" :aria-label="t('mobile.shell.close')" @click="closePopup">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17" /></svg>
      </button>

      <div class="side-content relative">
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
  border: 1px solid var(--mobile-border);
  background: var(--mobile-surface);
}

.side-content {
  @apply
  /*grid grid-cols-[auto_1fr] */
  flex flex-col overflow-y-auto max-h-[90vh] desktop:max-h-[80vh] items-center;
  @apply rounded-4xl;
  @apply p-8;
  padding-top: 6rem;
  @apply pb-20;
  /* @apply wrap-normal text-balance; */
  @apply pr-[24px];
  @apply bg-white;
  @apply gap-y-2;
  @apply relative;
}

.side-control {
  position: absolute;
  top: 1.25rem;
  z-index: 10;
  display: grid;
  width: 3rem;
  height: 3rem;
  min-width: 3rem;
  min-height: 3rem;
  place-items: center;
  border: 1px solid var(--mobile-border);
  border-radius: 999px;
  background: var(--mobile-cream);
  color: var(--mobile-ink);
}

.side-control--back { left: 1.25rem; }
.side-control--close {
  right: 1.25rem;
  border-color: var(--mobile-yellow-strong);
  background: var(--mobile-yellow);
}

.side-control svg {
  display: block;
  width: 1.25rem;
  height: 1.25rem;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2.25;
}

.side-content>button.small {
  @apply py-1 mr-4 self-start flex flex-row items-center border-none bg-transparent;
}

.side-content>button.big {
  @apply py-1 -ml-3 mr-4 self-start flex flex-row items-center border-none bg-transparent;
}

/*aside > div :not(button:first-of-type, h1:first-of-type) {
  @apply col-span-2;
}*/

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
  background: linear-gradient(to bottom,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 1) 100%);
}
</style>
