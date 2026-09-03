<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  watch
} from 'vue';
import liquidGL from 'liquid-gl';

const props = defineProps({
  snapshot: {
    type: String,
    default: 'body'
  },
  resolution: {
    type: Number,
    default: 1.5
  },
  refraction: {
    type: Number,
    default: 0.01
  },
  aberration: {
    type: Number,
    default: 0
  },
  frost: {
    type: Number,
    default: 0.9
  },
  bevelDepth: {
    type: Number,
    default: 0.08
  },
  bevelWidth: {
    type: Number,
    default: 0.15
  },
  magnify: {
    type: Number,
    default: 1
  },
  shadow: {
    type: Boolean,
    default: true
  },
  specular: {
    type: Boolean,
    default: true
  },
  tilt: {
    type: Boolean,
    default: false
  },
  tiltFactor: {
    type: Number,
    default: 4
  },
  tiltEase: {
    type: Number,
    default: 400
  },
  reveal: {
    type: String,
    default: 'fade',
    validator: (value) => ['fade', 'none'].includes(value)
  }
});

const emit = defineEmits(['ready', 'error']);

const target = ref(null);
const status = ref('pending');
const id = `liquid-glass-${useId().replace(/:/g, '')}`;

let glassInstance = null;
let loadHandler = null;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const liveOptions = computed(() => ({
  refraction: clamp(props.refraction, 0, 1),
  aberration: clamp(props.aberration, 0, 1),
  frost: Math.max(0, props.frost),
  bevelDepth: clamp(props.bevelDepth, 0, 1),
  bevelWidth: clamp(props.bevelWidth, 0, 1),
  magnify: clamp(props.magnify, 0.001, 3),
  shadow: props.shadow,
  specular: props.specular,
  tilt: props.tilt,
  tiltFactor: clamp(props.tiltFactor, 0, 25),
  tiltEase: Math.max(0, props.tiltEase)
}));

function markReady(instance) {
  status.value = 'ready';
  emit('ready', instance);
}

function initialise() {
  if (!target.value || status.value !== 'pending') return;

  if (window.matchMedia('(prefers-reduced-transparency: reduce)').matches) {
    status.value = 'fallback';
    return;
  }

  status.value = 'initialising';

  try {
    glassInstance = liquidGL({
      target: `#${id}`,
      snapshot: props.snapshot,
      resolution: clamp(props.resolution, 0.1, 3),
      ...liveOptions.value,
      reveal: props.reveal,
      on: {
        init: markReady
      }
    });

    // The CSS fallback returns the target node and has no init callback.
    if (glassInstance instanceof Element) markReady(glassInstance);
  } catch (error) {
    status.value = 'fallback';
    emit('error', error);
    console.error('Unable to initialise the liquid glass effect.', error);
  }
}

function refresh() {
  const renderer = glassInstance?.renderer;
  glassInstance?.updateMetrics?.();
  renderer?.captureSnapshot?.();
  renderer?.render?.();
}

watch(liveOptions, (options) => {
  if (!glassInstance?.options) return;

  const tiltChanged = glassInstance.options.tilt !== options.tilt;
  const shadowChanged = glassInstance.options.shadow !== options.shadow;
  Object.assign(glassInstance.options, options);

  if (tiltChanged) glassInstance.setTilt?.(options.tilt);
  if (shadowChanged) glassInstance.setShadow?.(options.shadow);
  refresh();
});

onMounted(async () => {
  await nextTick();

  // Waiting for images and fonts prevents the initial snapshot from being stale.
  if (document.readyState === 'complete') {
    initialise();
  } else {
    loadHandler = initialise;
    window.addEventListener('load', loadHandler, { once: true });
  }
});

onBeforeUnmount(() => {
  if (loadHandler) window.removeEventListener('load', loadHandler);

  // liquid-gl currently has no public destroy method, so release its per-lens
  // observers and helpers while leaving a shared renderer available to others.
  const renderer = glassInstance?.renderer;
  glassInstance?._sizeObs?.disconnect?.();
  glassInstance?.setTilt?.(false);
  glassInstance?.setShadow?.(false);

  if (renderer?.lenses) {
    const index = renderer.lenses.indexOf(glassInstance);
    if (index !== -1) renderer.lenses.splice(index, 1);
  }
});

defineExpose({ refresh });
</script>

<template>
  <div
    :id="id"
    ref="target"
    class="liquid-glass"
    :class="`liquid-glass--${status}`"
  >
    <div class="liquid-glass__content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.liquid-glass {
  position: fixed;
  isolation: isolate;
  background: rgba(255, 255, 255, 0.42);
  -webkit-backdrop-filter: blur(18px) saturate(145%);
  backdrop-filter: blur(18px) saturate(145%);
}

.liquid-glass__content {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  pointer-events: auto;
}

@supports not ((backdrop-filter: blur(1px))) {
  .liquid-glass {
    background: rgba(255, 255, 255, 0.88);
  }
}

@media (prefers-reduced-transparency: reduce) {
  .liquid-glass {
    background: rgb(255, 255, 255);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}
</style>
