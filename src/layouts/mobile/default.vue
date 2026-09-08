<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { MobilePresentation } from '@/router-meta';
import RecordingsMap from '@/views/map/RecordingsMap.vue';
import MobileNav from '@/views/nav/MobileNav.vue';
import { t } from '@/components/TranslatedText.vue';

const route = useRoute();
const router = useRouter();
const showCardShell = computed(() => route.path !== '/');
const presentation = computed<MobilePresentation>(
  () => route.meta.mobilePresentation ?? 'sheet'
);

const dragOffset = ref(0);
const isDragging = ref(false);
const pendingDrag = ref(false);
const dragStartY = ref(0);
const lastY = ref(0);
const lastTime = ref(0);
const velocity = ref(0);
const startedOnGrabber = ref(false);
const activeInteractionId = ref<number | null>(null);
const cardScrollRef = ref<HTMLElement | null>(null);
const cardRef = ref<HTMLElement | null>(null);
const previouslyFocused = ref<HTMLElement | null>(null);

const isGrabber = (target: EventTarget | null) => {
  if (!target) return false;
  return Boolean((target as HTMLElement).closest('.mobile-shell__header'));
};

const cardStyle = computed(() => ({
  transform: dragOffset.value ? `translateY(${dragOffset.value}px)` : undefined,
  transition: isDragging.value
    ? 'none'
    : 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)'
}));

const releasePointerCapture = () => {
  const cardEl = cardRef.value;
  if (
    cardEl &&
    activeInteractionId.value != null &&
    cardEl.hasPointerCapture(activeInteractionId.value)
  ) {
    cardEl.releasePointerCapture(activeInteractionId.value);
  }
};

const resetDragState = () => {
  isDragging.value = false;
  pendingDrag.value = false;
  startedOnGrabber.value = false;
  activeInteractionId.value = null;
  velocity.value = 0;
};

const closeCard = () => {
  if (route.path !== '/') {
    router.push('/');
  }
};

const goBack = () => {
  if (window.history.state?.back) {
    router.back();
  } else {
    closeCard();
  }
};

const onSheetKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') closeCard();
};

const canDragFromScroll = () => (cardScrollRef.value?.scrollTop ?? 0) <= 0;

const beginPendingDrag = (startY: number, target: EventTarget | null) => {
  pendingDrag.value = true;
  dragStartY.value = startY;
  lastY.value = startY;
  lastTime.value = performance.now();
  dragOffset.value = 0;
  startedOnGrabber.value = isGrabber(target);
};

const maybeStartDrag = (currentY: number) => {
  if (!pendingDrag.value || activeInteractionId.value === null) return false;

  const delta = currentY - dragStartY.value;

  if (!startedOnGrabber.value && !canDragFromScroll()) {
    pendingDrag.value = false;
    return false;
  }

  if (delta > 8) {
    isDragging.value = true;
    pendingDrag.value = false;
    // Adjust dragStartY so the offset starts smoothly at 0
    dragStartY.value = currentY;
    cardRef.value?.setPointerCapture(activeInteractionId.value);
    return true;
  }

  if (delta < -8 && !startedOnGrabber.value) {
    pendingDrag.value = false;
  }
  return false;
};

const onPointerDown = (event: PointerEvent) => {
  if (
    !showCardShell.value ||
    presentation.value !== 'sheet' ||
    event.button !== 0 ||
    !(event.target as HTMLElement | null)?.closest('.mobile-shell__header') ||
    Boolean((event.target as HTMLElement | null)?.closest('button, a'))
  )
    return;

  activeInteractionId.value = event.pointerId;
  beginPendingDrag(event.clientY, event.target);
};

const onPointerMove = (event: PointerEvent) => {
  if (activeInteractionId.value !== event.pointerId) return;

  const now = performance.now();
  const dt = now - lastTime.value;
  if (dt > 0) {
    velocity.value = (event.clientY - lastY.value) / dt;
  }
  lastY.value = event.clientY;
  lastTime.value = now;

  if (!isDragging.value && !maybeStartDrag(event.clientY)) {
    return;
  }

  if (isDragging.value) {
    dragOffset.value = Math.max(0, event.clientY - dragStartY.value);
    if (event.cancelable) {
      event.preventDefault();
    }
  }
};

const onPointerEnd = (event: PointerEvent) => {
  if (activeInteractionId.value !== event.pointerId) return;

  releasePointerCapture();

  if (isDragging.value) {
    // Logic: close if dragged far enough OR if swiped down fast
    const shouldClose = dragOffset.value > 140 || velocity.value > 0.5;

    if (shouldClose) {
      // Transition is enabled because isDragging is false
      isDragging.value = false;
      closeCard();
    } else {
      dragOffset.value = 0;
      isDragging.value = false;
    }
  }

  resetDragState();
};

const onTransitionAfterLeave = () => {
  dragOffset.value = 0;
};

watch(showCardShell, (isCardVisible) => {
  if (!isCardVisible) {
    releasePointerCapture();
    resetDragState();
  }
});

watch(
  () => route.fullPath,
  async () => {
    dragOffset.value = 0;
    await nextTick();
    cardScrollRef.value?.scrollTo({ top: 0 });
    cardRef.value?.focus({ preventScroll: true });
  }
);

const syncViewportHeight = () => {
  const height = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty(
    '--mobile-viewport-height',
    `${height}px`
  );
};

const onGlobalKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && showCardShell.value) closeCard();
};

onMounted(() => {
  previouslyFocused.value = document.activeElement as HTMLElement | null;
  syncViewportHeight();
  window.visualViewport?.addEventListener('resize', syncViewportHeight);
  window.addEventListener('resize', syncViewportHeight);
  window.addEventListener('keydown', onGlobalKeydown);
});

onUnmounted(() => {
  window.visualViewport?.removeEventListener('resize', syncViewportHeight);
  window.removeEventListener('resize', syncViewportHeight);
  window.removeEventListener('keydown', onGlobalKeydown);
  previouslyFocused.value?.focus?.({ preventScroll: true });
});
</script>

<template>
  <div
    class="mobile-shell"
    :data-card="showCardShell"
  >
    <div
      class="mobile-shell__map"
      :data-interactive="!showCardShell"
      :aria-hidden="showCardShell || undefined"
    >
      <RecordingsMap class="mobile-shell__map-canvas" />
    </div>

    <div class="mobile-shell__body">
      <router-view v-slot="{ Component, route: currentRoute }">
        <Transition
          name="mobile-card"
          mode="out-in"
          appear
          @after-leave="onTransitionAfterLeave"
        >
          <div
            v-if="showCardShell"
            :key="`sheet-${currentRoute.fullPath}`"
            class="mobile-shell__card"
            ref="cardRef"
            tabindex="-1"
            :style="cardStyle"
            :data-dragging="isDragging"
            :data-presentation="presentation"
            @pointermove="onPointerMove"
            @pointerup="onPointerEnd"
            @pointercancel="onPointerEnd"
            @keydown="onSheetKeydown"
          >
            <header
              class="mobile-shell__header"
              @pointerdown="onPointerDown"
            >
              <button
                type="button"
                class="mobile-shell__header-button"
                :aria-label="t('mobile.shell.back')"
                @click="goBack"
              >
                <svg class="mobile-shell__back-icon" aria-hidden="true" viewBox="0 0 24 24">
                  <path d="m14.5 6-6 6 6 6" />
                </svg>
              </button>
              <span
                v-if="presentation === 'sheet'"
                class="mobile-shell__grabber"
                aria-hidden="true"
              />
              <span v-else class="mobile-shell__header-spacer" />
              <button
                type="button"
                class="mobile-shell__header-button mobile-shell__header-button--close"
                :aria-label="t('mobile.shell.close')"
                @click="closeCard"
              >
                <svg class="mobile-shell__close-icon" aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M7 7l10 10M17 7 7 17" />
                </svg>
              </button>
            </header>
            <div
              ref="cardScrollRef"
              class="mobile-shell__card-scroll"
            >
              <main class="mobile-route-content">
                <component :is="Component" />
              </main>
            </div>
          </div>
          <div
            v-else
            class="mobile-shell__map-page"
            :key="`map-${currentRoute.fullPath}`"
          >
            <component :is="Component" />
          </div>
        </Transition>
      </router-view>
    </div>

    <MobileNav />
  </div>
</template>

<style scoped>
@reference "../../styles/main.css";

:global(html),
:global(body) {
  overscroll-behavior-y: none;
  overflow: hidden;
}

.mobile-shell {
  @apply relative grid w-full overflow-hidden;
  height: var(--mobile-viewport-height, 100dvh);
  grid-template-rows: minmax(0, 1fr) auto;
  background: var(--mobile-cream);
  overscroll-behavior-y: none;
}

.mobile-shell__map {
  @apply relative z-0 flex min-h-0;
  grid-column: 1;
  grid-row: 1;
  transition: filter 220ms ease, opacity 220ms ease;
}

.mobile-shell__map[data-interactive='false'] {
  @apply pointer-events-none;
  filter: saturate(0.72) brightness(0.72);
}

.mobile-shell__map-canvas {
  @apply h-full w-full;
}

.mobile-shell__body {
  @apply pointer-events-none relative z-10 flex min-h-0 flex-col;
  grid-column: 1;
  grid-row: 1;
}

.mobile-shell__map-page {
  @apply flex flex-1 flex-col;
}

.mobile-shell__card {
  @apply pointer-events-auto relative mx-2 mt-auto flex min-h-0 w-auto flex-col overflow-hidden;
  max-height: calc(100% - 0.75rem);
  border: 1px solid var(--mobile-border);
  border-bottom: 0;
  border-radius: 2rem 2rem 0 0;
  background: var(--mobile-surface);
  box-shadow: var(--mobile-shadow-raised);
  will-change: transform;
}

.mobile-shell__card[data-dragging='true'] {
  touch-action: none;
}

.mobile-shell__card[data-presentation='dialog'] {
  width: min(calc(100% - 1.5rem), 32rem);
  max-height: min(78%, 42rem);
  margin: auto;
  border-bottom: 1px solid var(--mobile-border);
  border-radius: 1.75rem;
}

.mobile-shell__card[data-presentation='workspace'] {
  width: 100%;
  height: 100%;
  max-height: none;
  margin: 0;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.mobile-shell__header {
  @apply relative flex shrink-0 items-center justify-between px-3 pt-2;
  min-height: 3.5rem;
  border-bottom: 1px solid color-mix(in srgb, var(--mobile-border) 60%, transparent);
  background: var(--mobile-surface);
  touch-action: none;
}

.mobile-shell__header-button {
  @apply flex min-h-11 min-w-11 items-center justify-center rounded-full;
  border: 1px solid var(--mobile-border);
  background: var(--mobile-cream);
  color: var(--mobile-ink);
}

.mobile-shell__header-button--close {
  background: var(--mobile-yellow);
  border-color: var(--mobile-yellow-strong);
}

.mobile-shell__header-button svg {
  display: block;
  flex: none;
  width: 1.2rem;
  height: 1.2rem;
  overflow: visible;
}

.mobile-shell__header-button svg path {
  fill: none;
  stroke: currentColor;
  stroke-width: 2.25;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.mobile-shell__grabber {
  @apply absolute left-1/2 top-2 block h-1.5 w-12 -translate-x-1/2 rounded-full;
  background: var(--mobile-border);
  touch-action: none;
}

.mobile-shell__header-spacer {
  width: 3rem;
}

.mobile-shell__card-scroll {
  @apply flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5;
  scrollbar-gutter: stable;
  overscroll-behavior-y: contain;
}

.mobile-shell__card[data-presentation='workspace'] .mobile-shell__card-scroll {
  padding-bottom: calc(1rem + env(safe-area-inset-bottom));
}

.mobile-card-enter-active,
.mobile-card-leave-active {
  @apply transition-all;
  transition-duration: 400ms;
  transition-timing-function: cubic-bezier(0.32, 0.72, 0, 1);
}

.mobile-card-enter-from,
.mobile-card-leave-to {
  @apply translate-y-full opacity-0;
}
</style>
