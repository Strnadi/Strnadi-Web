<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { accountStore } from '@/state/AccountStore';

import MapIcon from '@/icons/interface/icon-map.svg';
import AccountIcon from '@/icons/interface/icon-profile.svg';
import UploadIcon from '@/icons/interface/icon-upload.svg';
import InfoIcon from '@/icons/interface/icon-info.svg';
import DownloadIcon from '@/icons/interface/icon-download.svg';
import TranslatedText from '@/components/TranslatedText.vue';

const route = useRoute();

const matchesRoute = (...prefixes: string[]) =>
  prefixes.some((prefix) =>
    prefix === '/' ? route.path === '/' : route.path.startsWith(prefix)
  );

const accountLink = computed(() =>
  accountStore.user ? '/ucet/muj-ucet' : '/ucet/vitejte'
);
const accountLabelIdentifier = computed(() =>
  accountStore.user ? 'navigation.account' : 'navigation.login'
);
</script>

<template>
  <nav
    class="mobile-nav"
    role="navigation"
    aria-label="Bottom navigation"
  >
    <RouterLink
      to="/"
      class="mobile-nav__link"
      :class="{ 'mobile-nav__link--active': matchesRoute('/') }"
      :aria-current="matchesRoute('/') ? 'page' : undefined"
    >
      <MapIcon class="mobile-nav__icon" />
      <span class="mobile-nav__label">
        <TranslatedText identifier="navigation.map" />
      </span>
    </RouterLink>

    <RouterLink
      to="/informace"
      class="mobile-nav__link"
      :class="{ 'mobile-nav__link--active': matchesRoute('/informace') }"
      :aria-current="matchesRoute('/informace') ? 'page' : undefined"
    >
      <InfoIcon class="mobile-nav__icon" />
      <span class="mobile-nav__label">
        <TranslatedText identifier="navigation.information" />
      </span>
    </RouterLink>

    <RouterLink
      v-if="accountStore.user"
      to="/mapa/nahrat"
      class="mobile-nav__link"
      :class="{ 'mobile-nav__link--active': matchesRoute('/mapa/nahrat') }"
      :aria-current="matchesRoute('/mapa/nahrat') ? 'page' : undefined"
    >
      <UploadIcon class="mobile-nav__icon" />
      <span class="mobile-nav__label">
        <TranslatedText identifier="navigation.upload" />
      </span>
    </RouterLink>

    <RouterLink
      to="/aplikace"
      class="mobile-nav__link"
      :class="{ 'mobile-nav__link--active': matchesRoute('/aplikace') }"
      :aria-current="matchesRoute('/aplikace') ? 'page' : undefined"
    >
      <DownloadIcon class="mobile-nav__icon" />
      <span class="mobile-nav__label">
        <TranslatedText identifier="navigation.app" />
      </span>
    </RouterLink>

    <RouterLink
      :to="accountLink"
      class="mobile-nav__link"
      :class="{ 'mobile-nav__link--active': matchesRoute('/ucet') }"
      :aria-current="matchesRoute('/ucet') ? 'page' : undefined"
    >
      <AccountIcon class="mobile-nav__icon" />
      <span class="mobile-nav__label">
        <TranslatedText :identifier="accountLabelIdentifier" />
      </span>
    </RouterLink>
  </nav>
</template>

<style scoped>
@reference "../../styles/main.css";

nav.mobile-nav {
  @apply sticky bottom-0 z-20 flex w-full gap-1 border-t border-white/40 bg-white/90 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl drop-shadow-[0_-18px_45px_rgba(15,23,42,0.18)];
}

.mobile-nav__link {
  @apply flex flex-1 flex-col items-center justify-center gap-1 rounded-3xl px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 transition-all duration-200 ease-out touch-manipulation;
}

.mobile-nav__link--active {
  @apply bg-slate-100 text-slate-900;
}

.mobile-nav__icon {
  @apply h-6 w-6 transition-transform duration-200 ease-out;
}

.mobile-nav__link--active .mobile-nav__icon {
  @apply scale-110;
}

.mobile-nav__label {
  @apply leading-none;
}
</style>
