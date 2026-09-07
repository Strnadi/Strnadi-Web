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
import { t } from '@/components/TranslatedText.vue';

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

const isMapRoute = computed(
  () =>
    route.path === '/' ||
    (route.path.startsWith('/mapa/') && route.path !== '/mapa/nahrat')
);
const isAccountRoute = computed(() =>
  ['/ucet', '/uzivatel', '/sprava'].some((prefix) =>
    route.path.startsWith(prefix)
  )
);
</script>

<template>
  <nav
    class="mobile-nav"
    role="navigation"
    :aria-label="t('mobile.navigation.label')"
  >
    <RouterLink
      to="/"
      class="mobile-nav__link"
      :class="{ 'mobile-nav__link--active': isMapRoute }"
      :aria-current="isMapRoute ? 'page' : undefined"
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
      :class="{ 'mobile-nav__link--active': isAccountRoute }"
      :aria-current="isAccountRoute ? 'page' : undefined"
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
  @apply relative z-20 grid w-full gap-1 px-1.5 pt-2;
  grid-row: 2;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  padding-bottom: calc(0.45rem + env(safe-area-inset-bottom));
  border-top: 1px solid var(--mobile-border);
  background: var(--mobile-surface);
  box-shadow: 0 -10px 30px rgba(62, 51, 20, 0.12);
}

.mobile-nav__link {
  @apply flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1 text-center font-semibold transition-all duration-200 ease-out touch-manipulation;
  min-height: 3.5rem;
  color: var(--mobile-muted);
  white-space: nowrap;
  overflow: hidden;
}

.mobile-nav__link--active {
  color: var(--mobile-ink);
  background: var(--mobile-yellow);
}

.mobile-nav__icon {
  @apply block h-6 w-6 shrink-0 transition-transform duration-200 ease-out;
  transform-origin: center;
}

.mobile-nav__icon :deep(path),
.mobile-nav__icon :deep(circle) {
  vector-effect: non-scaling-stroke;
}

.mobile-nav__link--active .mobile-nav__icon {
  @apply scale-110;
}

.mobile-nav__label {
  @apply block w-full overflow-hidden text-ellipsis leading-none;
  max-width: 100%;
  font-size: clamp(0.58rem, 2.7vw, 0.72rem);
  white-space: nowrap;
}
</style>
