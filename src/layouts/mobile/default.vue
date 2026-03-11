<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import RecordingsMap from '@/views/map/RecordingsMap.vue';
import MobileNav from '@/views/nav/MobileNav.vue';

const route = useRoute();
const router = useRouter();
const showCardShell = computed(() => route.path !== '/');

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

const shouldSkipDrag = (target: EventTarget | null) => {
  if (!target) return false;
  return Boolean(
    (target as HTMLElement).closest(
      'a, button, input, textarea, select, summary, [role="button"], [data-no-drag]'
    )
  );
};

const isGrabber = (target: EventTarget | null) => {
  if (!target) return false;
  return (target as HTMLElement).classList.contains('mobile-shell__grabber');
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
  if (!showCardShell.value || event.button !== 0) return;
  if (shouldSkipDrag(event.target)) return;

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
</script>

<template>
  <div
    class="mobile-shell"
    :data-card="showCardShell"
  >
    <div
      class="mobile-shell__map"
      :data-interactive="!showCardShell"
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
            :style="cardStyle"
            :data-dragging="isDragging"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerEnd"
            @pointercancel="onPointerEnd"
          >
            <span class="mobile-shell__grabber" />
            <div
              ref="cardScrollRef"
              class="mobile-shell__card-scroll"
            >
              <component :is="Component" />
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
  @apply relative flex h-svh flex-col overflow-hidden bg-slate-200;
  overscroll-behavior-y: none;
}

.mobile-shell__map {
  @apply absolute inset-0 z-0 flex;
}

.mobile-shell__map[data-interactive='false'] {
  @apply pointer-events-none;
}

.mobile-shell__map-canvas {
  @apply h-full w-full;
}

.mobile-shell__body {
  @apply pointer-events-none relative z-10 flex flex-1 flex-col;
}

.mobile-shell__map-page {
  @apply flex flex-1 flex-col;
}

.mobile-shell__card {
  @apply pointer-events-auto relative mx-3 mt-auto flex w-auto max-h-[calc(100svh-4.5rem)] flex-col rounded-t-[36px] border border-white/30 bg-white/95 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-18px_35px_rgba(15,23,42,0.28)] touch-pan-y;
  will-change: transform;
}

.mobile-shell__card[data-dragging='true'] {
  touch-action: none;
}

.mobile-shell__card::before {
  content: '';
  @apply pointer-events-none absolute inset-x-0 -top-8 h-12 bg-gradient-to-b from-slate-900/10 to-transparent;
}

.mobile-shell__grabber {
  @apply mx-auto mb-4 block h-1.5 w-12 rounded-full bg-slate-300;
  touch-action: none;
}

.mobile-shell__card-scroll {
  @apply flex flex-1 flex-col overflow-y-auto px-4;
  overscroll-behavior-y: contain;
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
