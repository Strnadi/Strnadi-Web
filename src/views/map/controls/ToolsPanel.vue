<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useGeolocation } from '@vueuse/core';
import LocationSearch from '@/components/map/LocationSearch.vue';
import LocationArrowIcon from '@/icons/interface/icon-location-arrow.svg';
import OptionsIcon from '@/icons/interface/icon-options.svg';
import { MapStore } from '@/views/map/RecordingsMap.vue';
import { accountStore } from '@/state/AccountStore';
import { t } from '@/components/TranslatedText.vue';

defineProps<{ mode: 'mobile' | 'desktop' }>();

const { coords, isSupported: isGeolocationSupported } = useGeolocation();
const searchText = ref('');
const toolsShown = ref(false);
const desktopSearchOpen = ref(false);
const rootRef = ref<HTMLElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);

const hasValidLocation = computed(
  () =>
    isGeolocationSupported.value &&
    Number.isFinite(coords.value.latitude) &&
    Number.isFinite(coords.value.longitude) &&
    !(coords.value.latitude === 0 && coords.value.longitude === 0)
);

const activeToolCount = computed(
  () =>
    Number(MapStore.filter !== 'all') +
    Number(MapStore.scale) +
    Number(MapStore.aerial) +
    Number(MapStore.grouping) +
    Number(MapStore.onlyDialects) +
    Number(MapStore.hideOthersUnfinished)
);

const closeTools = () => {
  toolsShown.value = false;
};

const toggleTools = async () => {
  toolsShown.value = !toolsShown.value;
  if (toolsShown.value) {
    await nextTick();
    panelRef.value?.querySelector<HTMLElement>('select, button, a')?.focus();
  }
};

const toggleDesktopSearch = async () => {
  desktopSearchOpen.value = !desktopSearchOpen.value;
  if (desktopSearchOpen.value) {
    await nextTick();
    rootRef.value
      ?.querySelector<HTMLInputElement>('.map-tools__search input')
      ?.focus();
  }
};

const onDocumentPointerDown = (event: PointerEvent) => {
  if (
    (toolsShown.value || desktopSearchOpen.value) &&
    rootRef.value &&
    !rootRef.value.contains(event.target as Node)
  ) {
    closeTools();
    desktopSearchOpen.value = false;
  }
};

const onDocumentKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && toolsShown.value) closeTools();
};

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown);
  document.addEventListener('keydown', onDocumentKeydown);
});

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown);
  document.removeEventListener('keydown', onDocumentKeydown);
});
</script>

<template>
  <div ref="rootRef" class="map-tools" :data-mode="mode">
    <div class="map-tools__quick" :data-expanded="mode === 'mobile' || desktopSearchOpen">
      <button
        v-if="mode === 'desktop'"
        type="button"
        class="map-tools__search-toggle"
        :aria-label="t('mobile.map_tools.search')"
        :aria-expanded="desktopSearchOpen"
        :title="t('mobile.map_tools.search')"
        @click="toggleDesktopSearch"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="m20 20-4.35-4.35m2.35-5.15a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
      <button v-if="hasValidLocation && (mode === 'mobile' || desktopSearchOpen)" type="button" class="map-tools__quick-button"
        :aria-label="t('mobile.map_tools.my_location')" :title="t('mobile.map_tools.my_location')"
        @click="MapStore.move([coords.latitude, coords.longitude], 14)">
        <LocationArrowIcon />
      </button>

      <LocationSearch v-model:text="searchText" :placeholder="t('mobile.map_tools.search')" class="map-tools__search"
        @update:location="(location) => MapStore.move(location, 12)" />
    </div>

    <button type="button" class="map-tools__trigger" :class="{ 'map-tools__trigger--active': activeToolCount > 0 }"
      :aria-label="t('mobile.map_tools.open')" :aria-expanded="toolsShown" aria-controls="map-tools-panel"
      :title="t('mobile.map_tools.open')" @click="toggleTools">
      <OptionsIcon />
      <span>{{ t('mobile.map_tools.label') }}</span>
      <span v-if="activeToolCount" class="map-tools__count">{{ activeToolCount }}</span>
    </button>

    <Transition name="map-tools-panel">
      <section v-if="toolsShown" id="map-tools-panel" ref="panelRef" class="map-tools__panel" role="dialog"
        :aria-label="t('mobile.map_tools.panel_label')">
        <header class="map-tools__panel-header">
          <strong>{{ t('mobile.map_tools.panel_label') }}</strong>
          <button type="button" :aria-label="t('buttons.close')" @click="closeTools">×</button>
        </header>

        <label class="map-tools__filter">
          <span>{{ t('mobile.map_tools.recordings') }}</span>
          <select v-model="MapStore.filter">
            <option value="all">{{ t('mobile.map_tools.filters.all') }}</option>
            <option value="new">{{ t('mobile.map_tools.filters.new') }}</option>
            <option value="old">{{ t('mobile.map_tools.filters.old') }}</option>
            <option v-if="accountStore.user" value="my">{{ t('mobile.map_tools.filters.my') }}</option>
            <option v-if="accountStore.user" value="others">{{ t('mobile.map_tools.filters.others') }}</option>
            <option value="any-dialect">{{ t('mobile.map_tools.filters.dialect') }}</option>
          </select>
        </label>

        <div class="map-tools__toggles">
          <button type="button" :aria-pressed="MapStore.scale" @click="MapStore.scale = !MapStore.scale">
            <span>{{ t('mobile.map_tools.scale') }}</span><span class="map-tools__state">{{ MapStore.scale ?
              t('mobile.map_tools.on') : t('mobile.map_tools.off') }}</span>
          </button>
          <button type="button" :aria-pressed="MapStore.aerial" @click="MapStore.aerial = !MapStore.aerial">
            <span>{{ t('mobile.map_tools.aerial') }}</span><span class="map-tools__state">{{ MapStore.aerial ?
              t('mobile.map_tools.on') : t('mobile.map_tools.off') }}</span>
          </button>
          <button type="button" :aria-pressed="MapStore.grouping" @click="MapStore.grouping = !MapStore.grouping">
            <span>{{ t('mobile.map_tools.grouping') }}</span><span class="map-tools__state">{{ MapStore.grouping ?
              t('mobile.map_tools.on') : t('mobile.map_tools.off') }}</span>
          </button>
          <button type="button" :aria-pressed="MapStore.onlyDialects"
            @click="MapStore.onlyDialects = !MapStore.onlyDialects">
            <span>{{ t('mobile.map_tools.dialect_only') }}</span><span class="map-tools__state">{{ MapStore.onlyDialects
              ? t('mobile.map_tools.on') : t('mobile.map_tools.off') }}</span>
          </button>
          <button type="button" :aria-pressed="MapStore.hideOthersUnfinished"
            @click="MapStore.hideOthersUnfinished = !MapStore.hideOthersUnfinished">
            <span>{{ t('mobile.map_tools.hide_unfinished') }}</span><span class="map-tools__state">{{
              MapStore.hideOthersUnfinished ? t('mobile.map_tools.on') : t('mobile.map_tools.off') }}</span>
          </button>
        </div>

        <RouterLink class="map-tools__legend" to="/mapa/legenda" @click="closeTools">
          {{ t('mobile.map_tools.legend') }}
        </RouterLink>
      </section>
    </Transition>
  </div>
</template>

<style scoped>
@reference "../../../styles/main.css";

.map-tools {
  @apply pointer-events-none absolute inset-0 z-[1000];
}

.map-tools__quick {
  @apply pointer-events-auto absolute left-2 right-2 top-2 flex items-center gap-2;
}

.map-tools__quick-button,
.map-tools__trigger,
.map-tools__search-toggle {
  @apply flex min-h-12 items-center justify-center gap-2 rounded-2xl px-3 font-bold;
  border: 1px solid var(--mobile-border);
  background: var(--mobile-surface);
  color: var(--mobile-ink);
  box-shadow: var(--mobile-shadow);
}

.map-tools__quick-button {
  min-width: 3rem;
}

.map-tools__search-toggle {
  min-width: 3rem;
}

.map-tools__quick-button svg,
.map-tools__trigger svg,
.map-tools__search-toggle svg {
  display: block;
  flex: none;
  width: 1.35rem;
  height: 1.35rem;
}

.map-tools__search {
  @apply min-w-0 flex-1 rounded-2xl;
  min-height: 3rem;
  background: var(--mobile-surface);
  box-shadow: var(--mobile-shadow);
}

.map-tools__search :deep(input) {
  border: 2px solid var(--mobile-border) !important;
  border-radius: 1rem;
}

.map-tools__trigger {
  @apply pointer-events-auto absolute bottom-3 right-3;
}

.map-tools__trigger--active {
  background: var(--mobile-yellow);
  border-color: var(--mobile-yellow-strong);
}

.map-tools__count {
  @apply flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs;
  background: var(--mobile-ink);
  color: white;
}

.map-tools__panel {
  @apply pointer-events-auto absolute bottom-[4.75rem] right-3 flex flex-col gap-3 overflow-y-auto p-4;
  max-height: min(70vh, 36rem);
  width: min(calc(100% - 1.5rem), 24rem);
  border: 1px solid var(--mobile-border);
  border-radius: var(--mobile-radius-lg);
  background: var(--mobile-surface);
  color: var(--mobile-ink);
  box-shadow: var(--mobile-shadow-raised);
}

.map-tools__panel-header {
  @apply flex items-center justify-between gap-3 text-lg;
}

.map-tools__panel-header button {
  @apply flex min-h-11 min-w-11 items-center justify-center rounded-full text-2xl;
  background: var(--mobile-cream);
}

.map-tools__filter {
  @apply flex flex-col gap-1 text-sm font-bold;
}

.map-tools__filter select {
  @apply w-full rounded-xl px-3;
  min-height: 2.75rem;
}

.map-tools__toggles {
  @apply grid gap-2;
}

.map-tools__toggles button {
  @apply flex min-h-12 items-center justify-between gap-3 rounded-xl px-3 text-left;
  border: 1px solid var(--mobile-border);
  background: var(--mobile-cream);
}

.map-tools__toggles button[aria-pressed='true'] {
  border-color: var(--mobile-yellow-strong);
  background: var(--mobile-yellow);
}

.map-tools__state {
  color: var(--mobile-muted);
  font-size: 0.75rem;
}

.map-tools__legend {
  @apply flex min-h-11 items-center justify-center rounded-xl px-3 font-bold;
  border: 1px solid var(--mobile-border);
  background: var(--mobile-cream);
}

.map-tools[data-mode='desktop'] .map-tools__quick {
  top: auto;
  bottom: 1rem;
  left: auto;
  right: 7.5rem;
  width: 3rem;
  flex-direction: row-reverse;
  transition: width 240ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.map-tools[data-mode='desktop'] .map-tools__quick[data-expanded='true'] {
  width: min(34rem, calc(100% - 10rem));
}

.map-tools[data-mode='desktop'] .map-tools__search {
  width: 0;
  flex: 0 1 0%;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
  transform: translateX(0.5rem);
  transition:
    opacity 160ms ease,
    transform 240ms ease,
    flex-basis 240ms ease;
}

.map-tools[data-mode='desktop'] .map-tools__quick[data-expanded='true'] .map-tools__search {
  flex-basis: 100%;
  overflow: visible;
  opacity: 1;
  pointer-events: auto;
  transform: translateX(0);
}

.map-tools[data-mode='desktop'] .map-tools__trigger {
  bottom: 1rem;
  right: 1rem;
}

.map-tools[data-mode='desktop'] .map-tools__panel {
  bottom: 5.5rem;
  right: 1rem;
}

.map-tools-panel-enter-active,
.map-tools-panel-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}

.map-tools-panel-enter-from,
.map-tools-panel-leave-to {
  opacity: 0;
  transform: translateY(0.5rem) scale(0.98);
}
</style>
