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
const activeInteractionId = ref<number | null>(null);
const interactionSource = ref<'pointer' | 'touch' | null>(null);
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

const cardStyle = computed(() => ({
  transform: dragOffset.value ? `translateY(${dragOffset.value}px)` : undefined,
  transition: isDragging.value ? 'none' : undefined
}));

const releasePointerCapture = () => {
  const cardEl = cardRef.value;
  if (
    cardEl &&
    interactionSource.value === 'pointer' &&
    activeInteractionId.value != null &&
    cardEl.hasPointerCapture(activeInteractionId.value)
  ) {
    cardEl.releasePointerCapture(activeInteractionId.value);
  }
};

const resetDragState = () => {
  dragOffset.value = 0;
  isDragging.value = false;
  pendingDrag.value = false;
  activeInteractionId.value = null;
  interactionSource.value = null;
};

const closeCard = () => {
  if (route.path !== '/') {
    router.push('/');
  }
};

const canDragFromScroll = () => (cardScrollRef.value?.scrollTop ?? 0) <= 0;

const beginPendingDrag = (startY: number) => {
  pendingDrag.value = true;
  dragStartY.value = startY;
  dragOffset.value = 0;
};

const maybeStartDrag = (currentY: number) => {
  if (!pendingDrag.value) return false;
  if (!canDragFromScroll()) {
    pendingDrag.value = false;
    return false;
  }
  const delta = currentY - dragStartY.value;
  if (delta > 8) {
    isDragging.value = true;
    pendingDrag.value = false;
    return true;
  }
  if (delta < -8) {
    pendingDrag.value = false;
  }
  return false;
};

const onPointerDown = (event: PointerEvent) => {
  if (!showCardShell.value || event.button !== 0) return;
  if (shouldSkipDrag(event.target)) return;

  interactionSource.value = 'pointer';
  activeInteractionId.value = event.pointerId;
  cardRef.value?.setPointerCapture(event.pointerId);
  beginPendingDrag(event.clientY);
};

const onPointerMove = (event: PointerEvent) => {
  if (
    interactionSource.value !== 'pointer' ||
    activeInteractionId.value !== event.pointerId
  )
    return;
  if (!isDragging.value && !maybeStartDrag(event.clientY)) {
    return;
  }

  if (isDragging.value) {
    dragOffset.value = Math.max(0, event.clientY - dragStartY.value);
    event.preventDefault();
  }
};

const onPointerEnd = (event: PointerEvent) => {
  if (
    interactionSource.value !== 'pointer' ||
    activeInteractionId.value !== event.pointerId
  )
    return;

  releasePointerCapture();

  if (isDragging.value && dragOffset.value > 140) {
    closeCard();
  }

  resetDragState();
};

const findTouch = (list: TouchList, id: number | null): Touch | undefined => {
  if (id == null) return undefined;
  for (let i = 0; i < list.length; i += 1) {
    const t = list.item(i);
    if (t && t.identifier === id) {
      return t;
    }
  }
  return undefined;
};

const onTouchStart = (event: TouchEvent) => {
  if (!showCardShell.value || interactionSource.value) return;
  if (shouldSkipDrag(event.target)) return;
  const touch = event.changedTouches.item(0);
  if (!touch) return;

  interactionSource.value = 'touch';
  activeInteractionId.value = touch.identifier;
  beginPendingDrag(touch.clientY);
};

const onTouchMove = (event: TouchEvent) => {
  if (interactionSource.value !== 'touch') return;
  const touch = findTouch(event.touches, activeInteractionId.value);
  if (!touch) return;

  if (!isDragging.value && !maybeStartDrag(touch.clientY)) {
    return;
  }

  if (isDragging.value) {
    dragOffset.value = Math.max(0, touch.clientY - dragStartY.value);
    event.preventDefault();
  }
};

const onTouchEnd = (event: TouchEvent) => {
  if (interactionSource.value !== 'touch') return;
  const touch = findTouch(event.changedTouches, activeInteractionId.value);
  if (!touch) return;

  if (isDragging.value && dragOffset.value > 140) {
    closeCard();
  }

  resetDragState();
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
        >
          <div
            v-if="showCardShell"
            :key="`sheet-${currentRoute.fullPath}`"
            class="mobile-shell__card"
            ref="cardRef"
            :style="cardStyle"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerEnd"
            @pointercancel="onPointerEnd"
            @touchstart="onTouchStart"
            @touchmove="onTouchMove"
            @touchend="onTouchEnd"
            @touchcancel="onTouchEnd"
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

.mobile-shell {
  @apply relative flex min-h-svh flex-col overflow-hidden bg-slate-200;
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
  @apply relative z-10 flex flex-1 flex-col;
}

.mobile-shell__map-page {
  @apply flex flex-1 flex-col;
}

.mobile-shell__card {
  @apply relative mx-3 mt-auto flex w-auto max-h-[calc(100svh-4.5rem)] flex-col rounded-t-[36px] border border-white/30 bg-white/95 pb-[calc(2.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-18px_35px_rgba(15,23,42,0.28)] transition-transform duration-200 ease-out touch-pan-y;
}

.mobile-shell__card::before {
  content: '';
  @apply pointer-events-none absolute inset-x-0 -top-8 h-12 bg-gradient-to-b from-slate-900/10 to-transparent;
}

.mobile-shell__grabber {
  @apply mx-auto mb-4 block h-1.5 w-12 rounded-full bg-slate-300;
}

.mobile-shell__card-scroll {
  @apply flex flex-1 flex-col overflow-y-auto px-4;
}

.mobile-card-enter-active,
.mobile-card-leave-active {
  @apply transition-all duration-250 ease-out;
}

.mobile-card-enter-from,
.mobile-card-leave-to {
  @apply translate-y-4 opacity-0;
}
</style>
