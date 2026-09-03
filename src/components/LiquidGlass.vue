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
  autoContrast?: boolean;
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
  autoContrast: false,
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
let contrastPreference: MediaQueryList | null = null;
const markerImages = new WeakMap<HTMLElement, HTMLCanvasElement>();
const pendingMarkerCaptures = new WeakSet<HTMLElement>();
let contrastSampleCanvas: HTMLCanvasElement | null = null;
let lastContrastSample = 0;
let hasContrastSample = false;
let smoothedLuminance = 0.5;
let smoothedComplexity = 0;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const adaptiveContrast = ref(clamp(props.contrast, 0.5, 2));
const adaptiveBrightness = ref(1);
const adaptiveOverlay = ref('transparent');
const adaptiveForeground = ref('rgb(24 24 22 / 0.96)');
const adaptiveTextShadow = ref(
  '0 1px 1px rgb(255 255 255 / 0.42), 0 0 10px rgb(255 255 255 / 0.2)'
);
const adaptiveAppearance = ref<'light' | 'dark'>('light');

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
const glassStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {
    '--liquid-glass-contrast': String(
      props.autoContrast
        ? adaptiveContrast.value
        : clamp(props.contrast, 0.5, 2)
    )
  };

  if (props.autoContrast) {
    style['--liquid-glass-adaptive-brightness'] = String(
      adaptiveBrightness.value
    );
    style['--liquid-glass-adaptive-overlay'] = adaptiveOverlay.value;
    style['--liquid-glass-foreground'] = adaptiveForeground.value;
    style['--liquid-glass-text-shadow'] = adaptiveTextShadow.value;
  }

  return style;
});

function linearChannel(value: number) {
  const channel = value / 255;
  return channel <= 0.04045
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
}

function pixelLuminance(red: number, green: number, blue: number) {
  return (
    0.2126 * linearChannel(red) +
    0.7152 * linearChannel(green) +
    0.0722 * linearChannel(blue)
  );
}

function analyseBackdrop(
  source: HTMLCanvasElement,
  sourceX: number,
  sourceY: number,
  sourceWidth: number,
  sourceHeight: number
) {
  if (!props.autoContrast || sourceWidth <= 0 || sourceHeight <= 0) return;

  const now = performance.now();
  if (now - lastContrastSample < 72) return;
  lastContrastSample = now;

  contrastSampleCanvas ??= document.createElement('canvas');
  const sampleHeight = 12;
  const sampleWidth = clamp(
    Math.round((sourceWidth / sourceHeight) * sampleHeight),
    32,
    96
  );
  contrastSampleCanvas.width = sampleWidth;
  contrastSampleCanvas.height = sampleHeight;

  const context = contrastSampleCanvas.getContext('2d', {
    willReadFrequently: true
  });
  if (!context) return;

  try {
    context.clearRect(0, 0, sampleWidth, sampleHeight);
    context.drawImage(
      source,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      sampleWidth,
      sampleHeight
    );

    const pixels = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
    const luminances: number[] = [];
    let luminanceTotal = 0;
    let edgeTotal = 0;
    let edgeCount = 0;

    for (let pixel = 0; pixel < pixels.length; pixel += 4) {
      // Transparent pixels are composited over the map's neutral loading color.
      const alpha = pixels[pixel + 3] / 255;
      const red = pixels[pixel] * alpha + 245 * (1 - alpha);
      const green = pixels[pixel + 1] * alpha + 243 * (1 - alpha);
      const blue = pixels[pixel + 2] * alpha + 235 * (1 - alpha);
      const luminance = pixelLuminance(red, green, blue);
      const index = pixel / 4;

      luminances.push(luminance);
      luminanceTotal += luminance;

      if (index % sampleWidth !== 0) {
        edgeTotal += Math.abs(luminance - luminances[index - 1]);
        edgeCount += 1;
      }
      if (index >= sampleWidth) {
        edgeTotal += Math.abs(luminance - luminances[index - sampleWidth]);
        edgeCount += 1;
      }
    }

    if (!luminances.length) return;

    const mean = luminanceTotal / luminances.length;
    const variance =
      luminances.reduce(
        (total, luminance) => total + Math.pow(luminance - mean, 2),
        0
      ) / luminances.length;
    const ordered = [...luminances].sort((a, b) => a - b);
    const percentile = (amount: number) =>
      ordered[Math.round((ordered.length - 1) * amount)];
    const spread = percentile(0.9) - percentile(0.1);
    const detail = edgeCount ? edgeTotal / edgeCount : 0;
    const complexity = clamp(
      Math.sqrt(variance) * 1.35 + spread * 0.38 + detail * 0.8,
      0,
      1
    );

    const blend = hasContrastSample ? 0.28 : 1;
    smoothedLuminance += (mean - smoothedLuminance) * blend;
    smoothedComplexity += (complexity - smoothedComplexity) * blend;
    hasContrastSample = true;

    // Approximate the shader's brightness multiplication before deciding which
    // monochrome appearance will have the stronger contrast.
    const displayedLuminance = clamp(
      mean * (1 + config.value.brightness),
      0,
      1
    );

    // Separate enter/exit thresholds prevent light/dark flicker while panning.
    if (adaptiveAppearance.value === 'light' && displayedLuminance < 0.16) {
      adaptiveAppearance.value = 'dark';
    } else if (
      adaptiveAppearance.value === 'dark' &&
      displayedLuminance > 0.24
    ) {
      adaptiveAppearance.value = 'light';
    }

    const increasedContrast = window.matchMedia(
      '(prefers-contrast: more)'
    ).matches;
    const strength = increasedContrast ? 1.35 : 1;
    const contrast = clamp(
      props.contrast + 0.035 + smoothedComplexity * 0.16 * strength,
      0.65,
      1.65
    );

    adaptiveContrast.value = Number(contrast.toFixed(3));

    if (adaptiveAppearance.value === 'dark') {
      const overlayAlpha = clamp(
        (0.055 + smoothedComplexity * 0.105) * strength,
        0.05,
        increasedContrast ? 0.23 : 0.17
      );
      adaptiveBrightness.value = Number(
        clamp(0.94 - smoothedComplexity * 0.08, 0.84, 0.94).toFixed(3)
      );
      adaptiveOverlay.value = `rgb(5 7 10 / ${overlayAlpha.toFixed(3)})`;
      adaptiveForeground.value = 'rgb(255 255 255 / 0.97)';
      adaptiveTextShadow.value =
        '0 1px 2px rgb(0 0 0 / 0.62), 0 0 12px rgb(0 0 0 / 0.32)';
    } else {
      const overlayAlpha = clamp(
        (0.025 + smoothedComplexity * 0.07) * strength,
        0.02,
        increasedContrast ? 0.15 : 0.1
      );
      adaptiveBrightness.value = Number(
        clamp(1.025 + smoothedComplexity * 0.055, 1.025, 1.105).toFixed(3)
      );
      adaptiveOverlay.value = `rgb(255 255 252 / ${overlayAlpha.toFixed(3)})`;
      adaptiveForeground.value = 'rgb(24 24 22 / 0.96)';
      adaptiveTextShadow.value =
        '0 1px 1px rgb(255 255 255 / 0.46), 0 0 10px rgb(255 255 255 / 0.22)';
    }
  } catch {
    // A cross-origin resource may taint the capture after it was painted. The
    // glass still renders; retain the last safe contrast sample in that case.
  }
}

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

function markerOwner(node: Node) {
  const element = node instanceof Element ? node : node.parentElement;
  return element?.closest<HTMLElement>(
    '.leaflet-marker-icon, .leaflet-marker-shadow'
  );
}

function paintDomMarkers(
  context: CanvasRenderingContext2D,
  sceneLeft: number,
  sceneTop: number,
  sceneRight: number,
  sceneBottom: number
) {
  if (!captureRoot || !glassInstance) return;

  const markers = captureRoot.querySelectorAll<HTMLElement>(
    '.leaflet-marker-icon:not(img), .leaflet-marker-shadow:not(img)'
  );

  for (const marker of markers) {
    if (target.value?.contains(marker)) continue;

    const rect = marker.getBoundingClientRect();
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

    const style = window.getComputedStyle(marker);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      Number.parseFloat(style.opacity) === 0
    ) {
      continue;
    }

    const image = markerImages.get(marker);
    if (image) {
      context.globalAlpha = clamp(Number.parseFloat(style.opacity) || 1, 0, 1);
      context.drawImage(
        image,
        rect.left - sceneLeft,
        rect.top - sceneTop,
        rect.width,
        rect.height
      );
      context.globalAlpha = 1;
      continue;
    }

    if (pendingMarkerCaptures.has(marker)) continue;
    pendingMarkerCaptures.add(marker);
    void glassInstance.capture
      .captureToCanvas(marker, rect.width, rect.height)
      .then((captured) => {
        if (captured && marker.isConnected) markerImages.set(marker, captured);
      })
      .finally(() => {
        pendingMarkerCaptures.delete(marker);
        if (!disposed) scheduleRefresh();
      });
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

  // Leaflet divIcon and cluster markers are HTML rather than media elements.
  // Draw their cached appearance last so they stay above the live map tiles.
  analyseBackdrop(
    liveSceneCanvas,
    liveCapturePadding * dpr,
    liveCapturePadding * dpr,
    targetRect.width * dpr,
    targetRect.height * dpr
  );
  paintDomMarkers(context, sceneLeft, sceneTop, sceneRight, sceneBottom);
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
      for (const mutation of mutations) {
        if (
          mutation.type === 'childList' ||
          (mutation.type === 'attributes' && mutation.attributeName !== 'style')
        ) {
          const marker = markerOwner(mutation.target);
          if (marker) markerImages.delete(marker);
        }
      }

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
      attributeFilter: [
        'class',
        'src',
        'style',
        'colors',
        'dot',
        'questionmark'
      ],
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
    contrastPreference = window.matchMedia('(prefers-contrast: more)');
    contrastPreference.addEventListener('change', scheduleRefresh);
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

watch(
  () => [props.autoContrast, props.contrast],
  () => {
    if (props.autoContrast) {
      lastContrastSample = 0;
      scheduleRefresh();
    } else {
      adaptiveContrast.value = clamp(props.contrast, 0.5, 2);
    }
  }
);

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
  contrastPreference?.removeEventListener('change', scheduleRefresh);
  contrastPreference = null;
  cancelAnimationFrame(refreshFrame);
  glassInstance?.destroy();
  glassInstance = null;
  liveSceneCanvas?.remove();
  liveSceneCanvas = null;
  contrastSampleCanvas = null;

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
    :data-glass-appearance="autoContrast ? adaptiveAppearance : undefined"
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
  filter: brightness(var(--liquid-glass-adaptive-brightness, 1))
    contrast(var(--liquid-glass-contrast, 1));
  transition: filter 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.liquid-glass__content {
  position: relative;
  z-index: 1;
  isolation: isolate;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  color: var(--liquid-glass-foreground, inherit);
  text-shadow: var(--liquid-glass-text-shadow, none);
  pointer-events: auto;
  transition:
    color 220ms cubic-bezier(0.22, 1, 0.36, 1),
    text-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.liquid-glass__content::before {
  position: absolute;
  z-index: -1;
  inset: 0;
  border-radius: inherit;
  background: var(--liquid-glass-adaptive-overlay, transparent);
  pointer-events: none;
  content: '';
  transition: background 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.liquid-glass--fallback {
  border: 1px solid rgb(255 255 255 / 0.55);
  background: rgb(247 247 242 / 0.9);
  box-shadow:
    0 10px 30px rgb(15 23 42 / 0.13),
    inset 0 1px 0 rgb(255 255 255 / 0.82);
}

@media (prefers-reduced-motion: reduce) {
  .liquid-glass > :deep(canvas),
  .liquid-glass__content,
  .liquid-glass__content::before {
    transition: none;
  }
}
</style>
