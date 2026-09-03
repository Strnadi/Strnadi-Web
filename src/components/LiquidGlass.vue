<script setup lang="ts">
import { LiquidGlass, type GlassConfig } from '@ybouane/liquidglass';
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  watch
} from 'vue';

interface Props {
  root?: HTMLElement | null;
  blurAmount?: number;
  refraction?: number;
  chromAberration?: number;
  edgeHighlight?: number;
  specular?: number;
  fresnel?: number;
  distortion?: number;
  cornerRadius?: number;
  zRadius?: number;
  opacity?: number;
  saturation?: number;
  brightness?: number;
  contrast?: number;
  tintStrength?: number;
  shadowOpacity?: number;
  shadowSpread?: number;
  shadowOffsetY?: number;
  bevelMode?: 0 | 1;
  liveCapture?: boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  root: null,
  blurAmount: 0,
  refraction: 0.69,
  chromAberration: 0.05,
  edgeHighlight: 0.05,
  specular: 0,
  fresnel: 1,
  distortion: 0,
  cornerRadius: 65,
  zRadius: 40,
  opacity: 1,
  saturation: 0,
  brightness: 0,
  contrast: 1,
  tintStrength: 0,
  shadowOpacity: 0.3,
  shadowSpread: 10,
  shadowOffsetY: 1,
  bevelMode: 0,
  liveCapture: false,
  disabled: false
});

const emit = defineEmits<{
  ready: [instance: LiquidGlass];
  error: [error: unknown];
}>();

const target = ref<HTMLElement | null>(null);
const status = ref<'pending' | 'initialising' | 'ready' | 'fallback'>(
  'pending'
);
const id = `liquid-glass-${useId().replace(/:/g, '')}`;
const liveCapturePadding = 24;

let glassInstance: LiquidGlass | null = null;
let loadHandler: (() => void) | null = null;
let rootObserver: MutationObserver | null = null;
let refreshFrame = 0;
let disposed = false;
let captureRoot: HTMLElement | null = null;
let previousRootPosition = '';
let positionedRoot = false;
let liveSceneCanvas: HTMLCanvasElement | null = null;
let resourceLoadHandler: ((event: Event) => void) | null = null;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const config = computed<GlassConfig>(() => ({
  blurAmount: clamp(props.blurAmount, 0, 1),
  refraction: clamp(props.refraction, 0, 2),
  chromAberration: clamp(props.chromAberration, 0, 0.3),
  edgeHighlight: Math.max(0, props.edgeHighlight),
  specular: Math.max(0, props.specular),
  fresnel: Math.max(0, props.fresnel),
  distortion: Math.max(0, props.distortion),
  cornerRadius: Math.max(0, props.cornerRadius),
  zRadius: Math.max(1, props.zRadius),
  opacity: clamp(props.opacity, 0, 1),
  saturation: clamp(props.saturation, -1, 1),
  brightness: clamp(props.brightness, -0.5, 0.5),
  tintStrength: clamp(props.tintStrength, 0, 1),
  shadowOpacity: clamp(props.shadowOpacity, 0, 1),
  shadowSpread: Math.max(1, props.shadowSpread),
  shadowOffsetY: props.shadowOffsetY,
  floating: false,
  button: false,
  bevelMode: props.bevelMode
}));

const configJson = computed(() => JSON.stringify(config.value));
const glassStyle = computed(() => ({
  '--liquid-glass-contrast': String(clamp(props.contrast, 0.5, 2))
}));

function isCanvasSafeImage(image: HTMLImageElement) {
  if (!image.complete || image.naturalWidth === 0) return false;

  try {
    const url = new URL(image.currentSrc || image.src, document.baseURI);
    return (
      url.origin === window.location.origin ||
      url.protocol === 'data:' ||
      url.protocol === 'blob:' ||
      image.hasAttribute('crossorigin')
    );
  } catch {
    return false;
  }
}

function paintLiveScene() {
  if (!captureRoot || !liveSceneCanvas || !target.value) return;

  const rootRect = captureRoot.getBoundingClientRect();
  const targetRect = target.value.getBoundingClientRect();
  const sceneLeft = targetRect.left - liveCapturePadding;
  const sceneTop = targetRect.top - liveCapturePadding;
  const sceneRight = targetRect.right + liveCapturePadding;
  const sceneBottom = targetRect.bottom + liveCapturePadding;
  const sceneWidth = sceneRight - sceneLeft;
  const sceneHeight = sceneBottom - sceneTop;
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(sceneWidth * dpr));
  const height = Math.max(1, Math.round(sceneHeight * dpr));

  const left = `${sceneLeft - rootRect.left}px`;
  const top = `${sceneTop - rootRect.top}px`;
  const cssWidth = `${sceneWidth}px`;
  const cssHeight = `${sceneHeight}px`;
  if (liveSceneCanvas.style.left !== left) liveSceneCanvas.style.left = left;
  if (liveSceneCanvas.style.top !== top) liveSceneCanvas.style.top = top;
  if (liveSceneCanvas.style.width !== cssWidth) {
    liveSceneCanvas.style.width = cssWidth;
  }
  if (liveSceneCanvas.style.height !== cssHeight) {
    liveSceneCanvas.style.height = cssHeight;
  }

  if (liveSceneCanvas.width !== width) liveSceneCanvas.width = width;
  if (liveSceneCanvas.height !== height) liveSceneCanvas.height = height;

  const context = liveSceneCanvas.getContext('2d');
  if (!context) return;

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, sceneWidth, sceneHeight);

  // Cover Leaflet's gray unloaded-tile surface with a neutral map color.
  for (const map of captureRoot.querySelectorAll<HTMLElement>(
    '.leaflet-container'
  )) {
    const rect = map.getBoundingClientRect();
    context.fillStyle = '#f5f3eb';
    context.fillRect(
      rect.left - sceneLeft,
      rect.top - sceneTop,
      rect.width,
      rect.height
    );
  }

  const media = captureRoot.querySelectorAll<
    HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
  >('img, canvas, video');

  for (const element of media) {
    if (element === liveSceneCanvas || target.value.contains(element)) continue;

    const rect = element.getBoundingClientRect();
    if (
      rect.width <= 0 ||
      rect.height <= 0 ||
      rect.right <= sceneLeft ||
      rect.bottom <= sceneTop ||
      rect.left >= sceneRight ||
      rect.top >= sceneBottom
    ) {
      continue;
    }

    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') continue;

    if (element instanceof HTMLImageElement && !isCanvasSafeImage(element)) {
      continue;
    }
    if (
      element instanceof HTMLCanvasElement &&
      (element.width === 0 || element.height === 0)
    ) {
      continue;
    }
    if (
      element instanceof HTMLVideoElement &&
      (element.readyState < 2 ||
        (!element.hasAttribute('crossorigin') &&
          new URL(element.currentSrc, document.baseURI).origin !==
            window.location.origin))
    ) {
      continue;
    }

    try {
      context.globalAlpha = clamp(Number.parseFloat(style.opacity) || 1, 0, 1);
      context.drawImage(
        element,
        rect.left - sceneLeft,
        rect.top - sceneTop,
        rect.width,
        rect.height
      );
    } catch {
      // Media can disappear between the DOM query and draw during tile swaps.
    } finally {
      context.globalAlpha = 1;
    }
  }
}

function setupLiveCapture(root: HTMLElement) {
  if (!props.liveCapture || !target.value) return;

  const canvas = document.createElement('canvas');
  const targetZIndex = Number.parseInt(
    window.getComputedStyle(target.value).zIndex,
    10
  );

  canvas.dataset.liquidGlassLiveScene = '';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.position = 'absolute';
  canvas.style.opacity = '0';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = String(
    Number.isNaN(targetZIndex) ? 0 : targetZIndex - 1
  );

  root.insertBefore(canvas, target.value);
  liveSceneCanvas = canvas;
  paintLiveScene();
}

function scheduleRefresh() {
  if (refreshFrame) return;

  refreshFrame = requestAnimationFrame(() => {
    refreshFrame = 0;
    paintLiveScene();
    glassInstance?.markChanged(liveSceneCanvas ?? undefined);
  });
}

async function initialise() {
  if (!target.value || status.value !== 'pending' || disposed) return;

  if (
    props.disabled ||
    window.matchMedia('(prefers-reduced-transparency: reduce)').matches
  ) {
    status.value = 'fallback';
    return;
  }

  const root = props.root ?? target.value.parentElement;
  if (!root || target.value.parentElement !== root) {
    const error = new Error(
      'LiquidGlass must be a direct child of its capture root.'
    );
    status.value = 'fallback';
    emit('error', error);
    return;
  }

  // The renderer measures and captures everything relative to this element.
  // Its reference implementation requires a positioned capture root.
  captureRoot = root;
  if (window.getComputedStyle(root).position === 'static') {
    previousRootPosition = root.style.position;
    root.style.position = 'relative';
    positionedRoot = true;
  }

  setupLiveCapture(root);

  status.value = 'initialising';

  try {
    const instance = await LiquidGlass.init({
      root,
      glassElements: [target.value],
      defaults: config.value
    });

    if (disposed) {
      instance.destroy();
      return;
    }

    glassInstance = instance;

    // Keep the refracted map live. Leaflet moves tiles with style mutations,
    // which the renderer cannot infer from the glass element itself.
    rootObserver = new MutationObserver((mutations) => {
      if (
        mutations.some(
          (mutation) => target.value && !target.value.contains(mutation.target)
        )
      ) {
        scheduleRefresh();
      }
    });
    rootObserver.observe(root, {
      attributes: true,
      attributeFilter: ['class', 'src', 'style'],
      childList: true,
      subtree: true
    });

    resourceLoadHandler = (event) => {
      if (
        event.target instanceof HTMLElement &&
        target.value?.contains(event.target)
      ) {
        return;
      }
      scheduleRefresh();
    };
    root.addEventListener('load', resourceLoadHandler, true);
    root.addEventListener('error', resourceLoadHandler, true);

    window.addEventListener('scroll', scheduleRefresh, { passive: true });
    window.addEventListener('resize', scheduleRefresh, { passive: true });
    scheduleRefresh();
    status.value = 'ready';
    emit('ready', instance);
  } catch (error) {
    status.value = 'fallback';
    emit('error', error);
    console.error('Unable to initialise the liquid glass effect.', error);
  }
}

function refresh(changedElement?: HTMLElement) {
  paintLiveScene();
  glassInstance?.markChanged(liveSceneCanvas ?? changedElement);
}

watch(configJson, () => {
  if (glassInstance && target.value) glassInstance.markChanged(target.value);
});

onMounted(async () => {
  await nextTick();

  if (document.readyState === 'complete') {
    void initialise();
  } else {
    loadHandler = () => void initialise();
    window.addEventListener('load', loadHandler, { once: true });
  }
});

onBeforeUnmount(() => {
  disposed = true;
  if (loadHandler) window.removeEventListener('load', loadHandler);
  rootObserver?.disconnect();
  if (resourceLoadHandler && captureRoot) {
    captureRoot.removeEventListener('load', resourceLoadHandler, true);
    captureRoot.removeEventListener('error', resourceLoadHandler, true);
  }
  window.removeEventListener('scroll', scheduleRefresh);
  window.removeEventListener('resize', scheduleRefresh);
  cancelAnimationFrame(refreshFrame);
  glassInstance?.destroy();
  glassInstance = null;
  liveSceneCanvas?.remove();
  liveSceneCanvas = null;

  if (positionedRoot && captureRoot?.style.position === 'relative') {
    captureRoot.style.position = previousRootPosition;
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
    :data-config="configJson"
    :style="glassStyle"
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
  background: transparent;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}

/* The library injects this canvas with an inline negative z-index. Keeping it
   at layer 0 makes the shader visible without letting it cover the controls. */
.liquid-glass > :deep(canvas) {
  z-index: 0 !important;
  filter: contrast(var(--liquid-glass-contrast, 1));
}

.liquid-glass__content {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  pointer-events: auto;
}
</style>
