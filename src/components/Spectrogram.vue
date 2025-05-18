<template>
  <div
    class="flex flex-col items-center gap-2 w-full"
    tabindex="0"
    @keydown.space.prevent="onSpacebarDown"
    @keyup.space.prevent="onSpacebarUp"
  >
    <div
      ref="spectrogramContainerRef"
      class="relative w-full border border-gray-300 overflow-hidden"
      :style="{ height: `${containerHeight}px` }"
      @mousemove="onSpectrogramMouseMove"
      @mouseenter="onSpectrogramMouseEnter"
      @mouseleave="showHoverLine = false"
    >
      <canvas
        ref="canvasRef"
        class="absolute top-0 left-0 block"
        :width="containerWidth"
        :height="containerHeight"
        :class="canvasCursorClass"
        @mousedown="onCanvasMouseDown"
        @click="onCanvasClick"
      />

      <div
        class="absolute top-0 left-0 w-full h-full"
        :class="overlayCursorClass"
        @mousedown="onRangeSelectStart"
      >
        <!-- Hover line shows the nextRangeColor -->
        <div
          v-if="
            showHoverLine &&
              isLoaded &&
              !isPanning &&
              !isDraggingProgress &&
              draggingRangeId === null &&
              !isSelecting &&
              !isSpacePanningActive &&
              !isSpacebarPressed
          "
          class="hover-line absolute top-0 h-full w-0.5 pointer-events-none"
          :style="{
            left: `${hoverLineX}px`,
            backgroundColor: hoverLineColor,
            top: `${margin.top}px`,
            height: `${containerHeight - margin.top - margin.bottom}px`
          }"
        />

        <!-- Already‐committed ranges -->
        <template
          v-for="r in visibleRanges"
          :key="r.id"
        >
          <div
            class="range-fill absolute opacity-50 rounded"
            :style="{
              left: `${r.left}px`,
              width: `${r.width}px`,
              background: r.color,
              top: `${margin.top}px`,
              height: `${containerHeight - margin.top - margin.bottom}px`
            }"
            @contextmenu.prevent="onRangeContextMenu($event, r.id)"
            @click.stop="handleRangeFillClick(r.id, $event)"
          />
          <div
            class="range-handle start absolute opacity-70 hover:opacity-100 transition-opacity"
            :class="{
              'scale-x-150':
                draggingRangeId === r.id && draggingHandle === 'start',
              'cursor-col-resize': !props.readonly,
              'cursor-default': props.readonly
            }"
            :style="{
              left: `${r.left}px`,
              top: `${margin.top}px`,
              height: `${containerHeight - margin.top - margin.bottom}px`,
              transform: 'translateX(-50%)',
              width: props.readonly ? '2px' : '20px',
              background: props.readonly ? r.color : 'transparent'
            }"
            @mousedown.stop.prevent="onHandleMouseDown(r.id, 'start')"
          >
            <template v-if="!props.readonly">
              <div class="relative w-full h-full">
                <!-- Vertical connecting line -->
                <div
                  class="absolute top-0 left-1/2 -translate-x-1/2 h-full"
                  :style="{
                    width: '2px',
                    backgroundColor: r.color
                  }"
                />
                <!-- Capsule -->
                <div
                  class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                  :style="{
                    width: '16px', // Content width, total 20px with borders
                    height: `${(containerHeight - margin.top - margin.bottom) * (2 / 3)}px`,
                    backgroundColor: 'white',
                    border: `2px solid ${r.color}`,
                    borderRadius: '10px', // Adjusted for new width
                    boxSizing: 'content-box',
                    zIndex: 1
                  }"
                />
              </div>
            </template>
          </div>
          <div
            class="range-handle end absolute opacity-70 hover:opacity-100 transition-opacity"
            :class="{
              'scale-x-150':
                draggingRangeId === r.id && draggingHandle === 'end',
              'cursor-col-resize': !props.readonly,
              'cursor-default': props.readonly
            }"
            :style="{
              left: `${r.left + r.width}px`,
              top: `${margin.top}px`,
              height: `${containerHeight - margin.top - margin.bottom}px`,
              transform: 'translateX(-50%)',
              width: props.readonly ? '2px' : '20px',
              background: props.readonly ? r.color : 'transparent'
            }"
            @mousedown.stop.prevent="onHandleMouseDown(r.id, 'end')"
          >
            <template v-if="!props.readonly">
              <div class="relative w-full h-full">
                <!-- Vertical connecting line -->
                <div
                  class="absolute top-0 left-1/2 -translate-x-1/2 h-full"
                  :style="{
                    width: '2px',
                    backgroundColor: r.color
                  }"
                />
                <!-- Capsule -->
                <div
                  class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                  :style="{
                    width: '16px', // Content width, total 20px with borders
                    height: `${(containerHeight - margin.top - margin.bottom) * (2 / 3)}px`,
                    backgroundColor: 'white',
                    border: `2px solid ${r.color}`,
                    borderRadius: '10px', // Adjusted for new width
                    boxSizing: 'content-box',
                    zIndex: 1
                  }"
                />
              </div>
            </template>
          </div>
        </template>

        <!-- Live‐drag selection box -->
        <div
          v-if="isSelecting"
          class="range-fill temp absolute pointer-events-none rounded"
          :style="{
            left: `${Math.min(selectStartXPx, selectCurrentXPx)}px`,
            width: `${Math.abs(selectCurrentXPx - selectStartXPx)}px`,
            backgroundColor: nextRangeColor,
            top: `${margin.top}px`,
            height: `${containerHeight - margin.top - margin.bottom}px`,
            zIndex: 40
          }"
        />
      </div>

      <!-- Progress line -->
      <div
        v-show="isLoaded"
        ref="progressLineRef"
        class="progress-line absolute top-0 w-0.5 h-full bg-red-600 cursor-col-resize"
        :style="{ left: '0px' }"
        @mousedown.stop.prevent="onProgressDragStart"
      />

      <!-- Loading spinner -->
      <div
        v-if="isLoading && !isLoaded"
        class="loading-spinner absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2.5"
      >
        <div
          class="spinner w-10 h-10 border-4 border-gray-200 border-l-black rounded-full animate-spin"
        />
        <span>Načítání...</span>
      </div>
    </div>

    <!-- Context Menu for Ranges -->
    <div
      v-if="isContextMenuVisible"
      ref="contextMenuRef"
      class="absolute bg-white border border-gray-300 rounded shadow-lg py-1 z-50"
      :style="{ top: `${contextMenuPosition.y}px`, left: `${contextMenuPosition.x}px` }"
      @click.stop
    >
      <ul>
        <li
          class="px-3 py-1.5 hover:bg-gray-100 cursor-pointer text-sm"
          @click="deleteRangeFromContextMenu"
        >
          Smazat označení
        </li>
        <!-- Future actions can be added here -->
      </ul>
    </div>

    <!-- Range Tooltip -->
    <div
      v-if="isRangeTooltipVisible && selectedRangeForTooltip"
      ref="rangeTooltipRef"
      class="absolute bg-white border border-gray-300 rounded shadow-lg p-2 z-[51]"
      :style="{ top: `${rangeTooltipPosition.y}px`, left: `${rangeTooltipPosition.x}px` }"
      @click.stop
    >
      <slot
        name="range-tooltip"
        :range="selectedRangeForTooltip"
        :close="closeRangeTooltip"
      />
    </div>

    <!-- Playback controls if no external audio element -->
    <div
      v-if="!props.audioElementProp"
      class="controls-container flex justify-center gap-2.5 w-full mt-2.5"
    >
      <button
        class="px-3 py-2 bg-gray-200 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:bg-gray-300"
        :disabled="isPlaying || !isLoaded"
        @click="playAudio"
      >
        {{ isPaused || currentTime > 0 ? 'Pokračovat' : 'Přehrát' }}
      </button>
      <button
        class="px-3 py-2 bg-gray-200 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:bg-gray-300"
        :disabled="!isPlaying || !isLoaded"
        @click="pauseAudio"
      >
        Pozastavit
      </button>
      <button
        class="px-3 py-2 bg-gray-200 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:bg-gray-300"
        :disabled="!isLoaded || (!isPlaying && !isPaused)"
        @click="stopAudio"
      >
        Zastavit
      </button>
      <button
        class="px-3 py-2 bg-gray-200 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:bg-gray-300"
        :disabled="!isLoaded"
        @click="rewindToAbsoluteStart"
      >
        Přehrát znovu
      </button>
    </div>

    <!-- Playback options -->
    <div
      v-if="isLoaded"
      class="playback-options-container w-full flex items-center justify-center gap-x-4 gap-y-2 mt-1 px-2.5 flex-wrap"
    >
      <label class="whitespace-nowrap text-sm">
        <input
          v-model="playInViewportOnly"
          type="checkbox"
          :disabled="autoScroll"
          class="mr-1 align-middle"
        >
        Jen zobrazená oblast
      </label>
      <label class="whitespace-nowrap text-sm">
        <input
          v-model="playInSelectionOnly"
          type="checkbox"
          :disabled="autoScroll || !isProgressInSelection"
          class="mr-1 align-middle"
        >
        Jen výběr
      </label>
      <label class="whitespace-nowrap text-sm">
        <input
          v-model="loopPlayback"
          type="checkbox"
          class="mr-1 align-middle"
        >
        Opakovat
      </label>
      <label class="whitespace-nowrap text-sm">
        <input
          v-model="autoScroll"
          type="checkbox"
          class="mr-1 align-middle"
        >
        Automatický posun
      </label>
    </div>

    <!-- Scrollbars -->
    <div
      v-if="isLoaded"
      class="w-full px-2.5 mt-2.5 space-y-2"
    >
      <!-- Pan Scrollbar -->
      <div
        v-if="spectrogramData.length > 0 && maxOffsetIndex > 0"
        class="pan-scrollbar h-5 flex items-center space-x-2"
      >
        <span class="text-xs w-10 text-right shrink-0">Posun:</span>
        <div
          ref="panTrackRef"
          class="pan-track flex-1 h-3 bg-gray-300 rounded relative cursor-pointer"
          @mousedown.prevent="onPanTrackMouseDown"
        >
          <div
            v-for="region in panBarRegions"
            :key="`panregion-${region.id}`"
            class="absolute h-full rounded"
            :style="{
              left: `${region.leftPx}px`,
              width: `${region.widthPx}px`,
              backgroundColor: region.color,
              zIndex: 1
            }"
          />
          <div
            v-for="spliceMarker in panBarSpliceMarkers"
            :key="spliceMarker.id"
            class="absolute h-full"
            :style="{
              left: `${spliceMarker.leftPx}px`,
              width: '2px',
              backgroundColor: 'rgba(0, 0, 0, 0.1)', // Semi-transparent black for splice markers
              zIndex: 1 // Same level as regions, or 2 to be above regions but below thumb
            }"
          />
          <div
            class="pan-thumb h-full bg-blue-500 rounded absolute"
            :style="panThumbStyle"
            @mousedown.stop.prevent="onPanThumbMouseDown"
            style="z-index: 2"
          />
        </div>
      </div>
      <div
        v-else-if="spectrogramData.length > 0"
        class="pan-scrollbar h-5 flex items-center space-x-2"
      >
        <span class="text-xs w-10 text-right shrink-0">Posun:</span>
        <div
          ref="panTrackRef"
          class="pan-track flex-1 h-3 bg-gray-300 rounded relative"
        >
          <div
            v-for="region in panBarRegions"
            :key="`panregion-static-${region.id}`"
            class="absolute h-full rounded"
            :style="{
              left: `${region.leftPx}px`,
              width: `${region.widthPx}px`,
              backgroundColor: region.color,
              zIndex: 1
            }"
          />
          <div
            v-for="spliceMarker in panBarSpliceMarkers"
            :key="`splice-static-${spliceMarker.id}`"
            class="absolute h-full"
            :style="{
              left: `${spliceMarker.leftPx}px`,
              width: '1px',
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              zIndex: 1
            }"
          />
          <div
            class="h-full bg-blue-400 rounded"
            style="z-index: 2"
          />
        </div>
      </div>

      <!-- Zoom Scrollbar -->
      <div
        v-if="zoomRange > 0"
        class="zoom-scrollbar h-5 flex items-center space-x-2"
      >
        <span class="text-xs w-10 text-right shrink-0">Zvětšení:</span>
        <div
          ref="zoomTrackRef"
          class="zoom-track flex-1 h-3 bg-gray-300 rounded relative cursor-pointer"
          @mousedown.prevent="onZoomTrackMouseDown"
        >
          <div
            class="zoom-thumb h-full bg-green-500 rounded absolute"
            :style="zoomThumbStyle"
            @mousedown.stop.prevent="onZoomThumbMouseDown"
          />
        </div>
      </div>
      <div
        v-else-if="isLoaded"
        class="zoom-scrollbar h-5 flex items-center space-x-2"
      >
        <span class="text-xs w-10 text-right shrink-0">Zoom:</span>
        <div
          ref="zoomTrackRef"
          class="zoom-track flex-1 h-3 bg-gray-300 rounded relative"
        >
          <div
            class="h-full bg-green-400 rounded absolute"
            :style="{ width: `${Z_THUMB_W}px`, left: '0px' }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onUnmounted,
  nextTick,
  defineProps,
  withDefaults,
  defineEmits
} from 'vue';
import { useDebounceFn } from '@vueuse/core';

interface Range {
  id: number | string;
  start: number;
  end: number;
  color: string;
}

const DEFAULT_BASE_ZOOM = 5;
const MIN_ZOOM_LEVEL = 1; // New constant for minimum zoom out

interface Props {
  audioUrls: string | string[];
  audioElementProp?: HTMLAudioElement | null;
  selected?: Range[];
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  maxFrequency?: number;
  colorScheme?: string[];
  sampleSize?: number;
  readonly?: boolean; // Add readonly prop
}

const props = withDefaults(defineProps<Props>(), {
  audioElementProp: undefined,
  selected: () => [],
  width: 0,
  height: 0,
  margin: () => ({ top: 20, right: 20, bottom: 30, left: 50 }),
  maxFrequency: 12000,
  colorScheme: () => [
    '#ffffff',
    '#f0f0f0',
    '#d9d9d9',
    '#bdbdbd',
    '#969696',
    '#737373',
    '#525252',
    '#252525',
    '#000000'
  ],
  sampleSize: 256,
  readonly: false // Default readonly to false
});

const emit = defineEmits<{
  'update:selected': [range: Range[]];
}>();

// Refs and state
const canvasRef = ref<HTMLCanvasElement | null>(null);
const spectrogramContainerRef = ref<HTMLElement | null>(null);
const progressLineRef = ref<HTMLElement | null>(null);
const contextMenuRef = ref<HTMLElement | null>(null); // Ref for context menu
const rangeTooltipRef = ref<HTMLElement | null>(null); // Ref for range tooltip

const isLoaded = ref(false);
const isLoading = ref(false);
const isPlaying = ref(false);
const isPaused = ref(false);
const startTime = ref(0);
const currentTime = ref(0);
const audioDuration = ref(0);
const spectrogramData = ref<{ time: number }[]>([]);
const cacheCanvas = ref<HTMLCanvasElement | null>(null);
const cacheHeightBins = ref(0);
const totalBins = ref(0);

// AudioContext + nodes
const internalAudioContext = ref<AudioContext | null>(null);
const liveAnalyser = ref<AnalyserNode | null>(null);
const gainNode = ref<GainNode | null>(null);
const audioSourceNode = ref<AudioBufferSourceNode | null>(null);
const audioBuffer = ref<AudioBuffer | null>(null);
const spliceTimes = ref<number[]>([]); // Stores the times where audio files are joined

// Dimensions
const containerWidth = ref(props.width);
const containerHeight = ref(props.height);
let resizeObserver: ResizeObserver | null = null;

// Zoom/pan
const zoomLevel = ref(DEFAULT_BASE_ZOOM); // Initial value, will be set properly in generateSpectrogramDataOffline
const offsetIndex = ref(0);
const windowSize = ref(0);
// const minVisibleCols = 500; // This was causing the zoom-in issue, REMOVE IT
const MIN_COLS_AT_MAX_ZOOM_DISPLAY = 20; // How many spectrogram columns are shown at maximum zoom-in.
const maxZoomLevel = computed(() => {
  const total = spectrogramData.value.length;
  if (!isLoaded.value || total === 0) {
    // If not loaded or no data, max zoom should allow the current zoomLevel (DEFAULT_BASE_ZOOM)
    // to be valid and ensure maxZoomLevel is at least MIN_ZOOM_LEVEL.
    // This ensures zoomRange (maxZoomLevel - MIN_ZOOM_LEVEL) is non-negative.
    return Math.max(MIN_ZOOM_LEVEL, DEFAULT_BASE_ZOOM);
  }
  // Calculate the zoom factor required to show MIN_COLS_AT_MAX_ZOOM_DISPLAY columns.
  const zoomFactorForMinDisplay = total / MIN_COLS_AT_MAX_ZOOM_DISPLAY;

  // maxZoomLevel must be at least MIN_ZOOM_LEVEL.
  // If zoomFactorForMinDisplay is less than MIN_ZOOM_LEVEL (e.g., for very short audio),
  // it means that even at MIN_ZOOM_LEVEL, you see all relevant detail or all the data.
  // In such cases, the effective maximum zoom is MIN_ZOOM_LEVEL (i.e., no further zoom-in beyond MIN_ZOOM_LEVEL is meaningful).
  return Math.max(MIN_ZOOM_LEVEL, zoomFactorForMinDisplay);
});

// Auto-scroll
const autoScroll = ref(false);

// Panning
const isPanning = ref(false); // Left-click drag pan when zoomed
const isSpacePanningActive = ref(false); // Spacebar + mouse drag pan
const isMiddleClickPanning = ref(false); // Middle-click drag pan
let panStartX = 0;
let panStartOffset = 0;

// Progress drag
const isDraggingProgress = ref(false);

// Ranges
const ranges = ref<Range[]>([]);
watch(() => props.selected, (newSelectedRanges) => {
  // Ensure we're not in an update loop if props.selected is programmatically updated
  // based on an emit from this component. A simple length/content check can help.
  // A more robust way might involve comparing deep values if performance allows,
  // or using a flag if emits cause direct prop updates.
  if (JSON.stringify(newSelectedRanges) !== JSON.stringify(ranges.value)) {
    ranges.value = JSON.parse(JSON.stringify(newSelectedRanges));
  }
}, { deep: true, immediate: true });

watch(ranges, (newRanges) => {
  emit('update:selected', JSON.parse(JSON.stringify(newRanges)));
}, { deep: true });

// Selection
const isSelecting = ref(false);
const selectStartXPx = ref(0);
const selectCurrentXPx = ref(0);
let mousedownX = 0;
let mousedownTime = 0;
const CLICK_THRESHOLD_MS = 250;
const CLICK_THRESHOLD_PX = 5;

// Handle‐drag
const draggingRangeId = ref<number | null>(null);
const draggingHandle = ref<'start' | 'end' | null>(null);

// Hover line
const showHoverLine = ref(false);
const hoverLineX = ref(0);
const nextRangeColor = ref(`hsla(${Math.random() * 360},70%,50%,0.4)`);

// Context Menu State
const isContextMenuVisible = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
const contextMenuRangeId = ref<number | null>(null);

// State for Range Tooltip
const isRangeTooltipVisible = ref(false);
const selectedRangeForTooltip = ref<Range | null>(null);
const rangeTooltipPosition = ref({ x: 0, y: 0 });

const hoverLineColor = computed(() => {
  if (props.readonly) {
    return 'rgb(220 38 38)'; // Tailwind's red-600
  }
  return nextRangeColor.value;
});

// Margin
const margin = computed(() => props.margin);

// Spacebar
const isSpacebarPressed = ref(false);

// New Playback Options
const playInViewportOnly = ref(false);
const playInSelectionOnly = ref(false);
const loopPlayback = ref(false);

const currentActiveSelectionRange = computed(() => {
  if (!isLoaded.value || !ranges.value.length || !spectrogramData.value.length)
    return null;
  for (const r of ranges.value) {
    if (currentTime.value >= r.start && currentTime.value < r.end) {
      return r;
    }
  }
  return null;
});

const isProgressInSelection = computed(
  () => !!currentActiveSelectionRange.value
);

// Watchers for playback options interaction
watch(autoScroll, (nv) => {
  if (nv) {
    playInViewportOnly.value = false;
    playInSelectionOnly.value = false;
  }
});
watch(playInViewportOnly, (nv) => {
  if (nv) {
    autoScroll.value = false;
    playInSelectionOnly.value = false;
  }
});
watch(playInSelectionOnly, (nv, ov) => {
  if (nv) {
    autoScroll.value = false;
    playInViewportOnly.value = false;
    if (!isProgressInSelection.value) {
      // If turned on when progress is not in selection, or selection disappears
      playInSelectionOnly.value = false;
    }
  }
});

watch(currentActiveSelectionRange, (newRange, oldRange) => {
  if (playInSelectionOnly.value && !newRange) {
    playInSelectionOnly.value = false;
    // If audio was playing and confined to a selection that disappeared,
    // it will now play normally or stop based on other conditions.
    // Consider stopping or pausing if it was playing due to this selection.
  }
});

watch(
  ranges,
  () => {
    // Re-evaluate if current time is still in a selection if ranges change
    if (playInSelectionOnly.value && !isProgressInSelection.value) {
      playInSelectionOnly.value = false;
    }
  },
  { deep: true }
);

// Utilities
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(v, hi));
}
function hexToRgb(h: string) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
  if (!m) return [0, 0, 0];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}
function timeToIndex(t: number): number {
  const A = spectrogramData.value;
  if (!A.length) return 0;
  let lo = 0,
    hi = A.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (A[mid].time < t) lo = mid + 1;
    else hi = mid;
  }
  return clamp(lo, 0, A.length - 1);
}

// Visible ranges in current view
const visibleRanges = computed(() => {
  const out: { id: number; left: number; width: number; color: string }[] = [];
  const total = spectrogramData.value.length;
  if (!isLoaded.value || !total || !canvasRef.value) return out;
  const dispW = containerWidth.value - margin.value.left - margin.value.right;
  if (dispW <= 0) return out;
  const sIdx = Math.floor(offsetIndex.value);
  const eIdx = Math.min(sIdx + Math.floor(windowSize.value), total);
  if (sIdx >= eIdx || sIdx < 0 || sIdx >= total) return out;
  const v0 = spectrogramData.value[sIdx].time;
  const v1 = spectrogramData.value[Math.max(sIdx, eIdx - 1)].time;
  const dur = v1 - v0;
  if (dur <= 0) return out;
  for (const r of ranges.value) {
    if (r.end <= v0 || r.start >= v1) continue;
    const rs = Math.max(r.start, v0);
    const re = Math.min(r.end, v1);
    const left = margin.value.left + ((rs - v0) / dur) * dispW;
    const right = margin.value.left + ((re - v0) / dur) * dispW;
    out.push({
      id: r.id,
      left,
      width: Math.max(0, right - left),
      color: r.color
    });
  }
  return out;
});

// Render
const debouncedRender = useDebounceFn(() => {
  if (isLoaded.value) renderSpectrogram();
}, 50);

function handleResize() {
  if (!spectrogramContainerRef.value) return;
  const rect = spectrogramContainerRef.value.getBoundingClientRect();
  if (!props.width) containerWidth.value = rect.width;
  if (!props.height) containerHeight.value = rect.height;
  if (canvasRef.value) {
    canvasRef.value.width = containerWidth.value;
    canvasRef.value.height = containerHeight.value;
  }
  // Update scrollbar track widths
  nextTick(() => {
    if (panTrackRef.value) panTrackDOMWidth.value = panTrackRef.value.offsetWidth;
    if (zoomTrackRef.value) zoomTrackDOMWidth.value = zoomTrackRef.value.offsetWidth;
  });
  debouncedRender();
}

// Process audio
async function loadAndProcessAudio() {
  isLoading.value = true;
  isLoaded.value = false;
  spliceTimes.value = []; // Reset splice times
  const audioCtx = getAudioContext();
  const urls = Array.isArray(props.audioUrls)
    ? props.audioUrls
    : [props.audioUrls];
  const decodedBuffers: AudioBuffer[] = [];
  const individualDurations: number[] = [];

  try {
    for (const url of urls) {
      const finalUrl =
        props.audioElementProp?.src === url ? props.audioElementProp.src : url;
      if (!finalUrl) continue;
      const resp = await fetch(finalUrl);
      const ab = await resp.arrayBuffer();
      const buf = await audioCtx.decodeAudioData(ab);
      decodedBuffers.push(buf);
      if (urls.length > 1) {
        individualDurations.push(buf.duration);
      }
    }
    if (!decodedBuffers.length) throw new Error('No audio decoded');

    if (decodedBuffers.length > 1) {
      const numCh = decodedBuffers[0].numberOfChannels;
      const sr = decodedBuffers[0].sampleRate;
      const totalLength = decodedBuffers.reduce((sum, b) => sum + b.length, 0);
      const out = audioCtx.createBuffer(numCh, totalLength, sr);
      let currentOffset = 0;
      for (const b of decodedBuffers) {
        for (let c = 0; c < numCh; c++) {
          out.copyToChannel(b.getChannelData(c), c, currentOffset);
        }
        currentOffset += b.length;
      }
      audioBuffer.value = out;

      // Calculate splice times from individual durations
      let cumulativeTime = 0;
      for (let i = 0; i < individualDurations.length - 1; i++) {
        cumulativeTime += individualDurations[i];
        spliceTimes.value.push(cumulativeTime);
      }
    } else if (decodedBuffers.length === 1) {
      audioBuffer.value = decodedBuffers[0];
      // No splices if only one buffer
    }
    audioDuration.value = audioBuffer.value!.duration; // audioBuffer will be set if decodedBuffers has items
    await generateSpectrogramDataOffline();
  } catch (err) {
    console.error('Error loading audio:', err);
    isLoaded.value = false;
  } finally {
    isLoading.value = false;
  }
}

async function generateSpectrogramDataOffline() {
  if (!audioBuffer.value) return;
  spectrogramData.value = [];
  const buf = audioBuffer.value;
  const offline = new OfflineAudioContext(
    buf.numberOfChannels,
    buf.length,
    buf.sampleRate
  );
  const analyser = offline.createAnalyser();
  analyser.fftSize = 4096;
  analyser.smoothingTimeConstant = 0;
  analyser.minDecibels = -80;
  analyser.maxDecibels = 80;
  totalBins.value = analyser.frequencyBinCount;

  const proc = offline.createScriptProcessor(
    props.sampleSize,
    buf.numberOfChannels,
    buf.numberOfChannels
  );
  const src = offline.createBufferSource();
  src.buffer = buf;
  src.connect(analyser);
  analyser.connect(proc);
  proc.connect(offline.destination);

  const freqData = new Uint8Array(analyser.frequencyBinCount);
  const temp: { time: number; values: Uint8Array }[] = [];
  let frame = 0;
  proc.onaudioprocess = () => {
    analyser.getByteFrequencyData(freqData);
    temp.push({
      time: frame * (props.sampleSize / buf.sampleRate),
      values: new Uint8Array(freqData)
    });
    frame++;
  };

  src.start(0);
  await offline.startRendering();
  src.disconnect();
  proc.disconnect();
  analyser.disconnect();

  spectrogramData.value = temp.map((d) => ({ time: d.time }));
  let minV = 255,
    maxV = 0;
  for (const col of temp) {
    for (const v of col.values) {
      minV = Math.min(minV, v);
      maxV = Math.max(maxV, v);
    }
  }
  const range = Math.max(1, maxV - minV);
  const nyq = buf.sampleRate / 2;
  const maxBin = Math.floor((totalBins.value * props.maxFrequency) / nyq);
  cacheHeightBins.value = maxBin + 1;

  const palette = new Uint8ClampedArray(256 * 4);
  for (let i = 0; i < 256; i++) {
    const norm = clamp((i - minV) / range, 0, 1);
    const idx = Math.floor(norm * (props.colorScheme.length - 1));
    const [r, g, b] = hexToRgb(props.colorScheme[idx]);
    palette[i * 4] = r;
    palette[i * 4 + 1] = g;
    palette[i * 4 + 2] = b;
    palette[i * 4 + 3] = 255;
  }

  const cols = temp.length,
    rows = cacheHeightBins.value;
  const offCanvas = document.createElement('canvas');
  offCanvas.width = cols;
  offCanvas.height = rows;
  const ctx2 = offCanvas.getContext('2d', { willReadFrequently: true })!;
  const img = ctx2.createImageData(cols, rows);
  for (let x = 0; x < cols; x++) {
    const vals = temp[x].values;
    for (let y = 0; y < rows; y++) {
      const v = vals[y];
      const pi = (y * cols + x) * 4,
        ci = v * 4;
      img.data[pi] = palette[ci];
      img.data[pi + 1] = palette[ci + 1];
      img.data[pi + 2] = palette[ci + 2];
      img.data[pi + 3] = 255;
    }
  }
  ctx2.putImageData(img, 0, 0);
  cacheCanvas.value = offCanvas;

  offsetIndex.value = 0;
  zoomLevel.value = DEFAULT_BASE_ZOOM;
  // Corrected windowSize calculation for initial setup
  windowSize.value = Math.max(
    MIN_COLS_AT_MAX_ZOOM_DISPLAY,
    Math.floor(spectrogramData.value.length / zoomLevel.value)
  );
  offsetIndex.value = clamp(
    offsetIndex.value,
    0,
    Math.max(0, spectrogramData.value.length - windowSize.value)
  );

  if (!props.audioElementProp) {
    const actx = getAudioContext();
    liveAnalyser.value = actx.createAnalyser();
    liveAnalyser.value.fftSize = 2048;
    gainNode.value = actx.createGain();
    gainNode.value.gain.value = 1;
    gainNode.value.connect(actx.destination);
  }

  isLoaded.value = true;
  await nextTick();
  handleResize();
}

// Render
function renderSpectrogram() {
  if (
    !canvasRef.value ||
    !cacheCanvas.value ||
    !isLoaded.value ||
    !spectrogramData.value.length
  )
    return;
  const ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;
  const dispW = containerWidth.value - margin.value.left - margin.value.right;
  const dispH = containerHeight.value - margin.value.top - margin.value.bottom;
  if (dispW <= 0 || dispH <= 0) return;
  const totalCols = cacheCanvas.value.width;
  const sIdx = Math.floor(offsetIndex.value);
  const num = Math.floor(windowSize.value);

  ctx.clearRect(0, 0, containerWidth.value, containerHeight.value);
  ctx.imageSmoothingEnabled = false;
  if (sIdx < totalCols && num > 0 && sIdx >= 0) {
    ctx.drawImage(
      cacheCanvas.value,
      sIdx,
      0,
      Math.min(num, totalCols - sIdx),
      cacheHeightBins.value,
      margin.value.left,
      margin.value.top,
      dispW,
      dispH
    );
  }
  const v0 = spectrogramData.value[sIdx]?.time || 0;
  const v1 =
    spectrogramData.value[Math.min(sIdx + num - 1, totalCols - 1)]?.time ||
    audioDuration.value;
  drawAxes(v0, v1);
  updateProgressLinePosition();
}

function drawAxes(v0: number, v1: number) {
  if (!canvasRef.value) return;
  const ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;
  ctx.save();
  ctx.strokeStyle = '#000';
  ctx.fillStyle = '#000';
  ctx.lineWidth = 1;
  ctx.font = '10px Arial';
  const x0 = margin.value.left,
    x1Val = containerWidth.value - margin.value.right;
  const yAxis = containerHeight.value - margin.value.bottom;
  ctx.beginPath();
  ctx.moveTo(x0, yAxis);
  ctx.lineTo(x1Val, yAxis);
  ctx.stroke();
  const steps = 5,
    span = v1 - v0;
  if (span > 0) {
    for (let i = 0; i <= steps; i++) {
      const f = i / steps,
        x = x0 + f * (x1Val - x0),
        t = v0 + span * f;
      ctx.beginPath();
      ctx.moveTo(x, yAxis);
      ctx.lineTo(x, yAxis + 4);
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillText(`${t.toFixed(1)}s`, x, yAxis + 14);
      if (i > 0 && i < steps) {
        ctx.beginPath();
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 0.5;
        ctx.moveTo(x, margin.value.top);
        ctx.lineTo(x, yAxis);
        ctx.stroke();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
      }
    }
  }
  const y0Val = margin.value.top,
    y1Val = containerHeight.value - margin.value.bottom,
    xAxisVal = margin.value.left;
  ctx.beginPath();
  ctx.moveTo(xAxisVal, y0Val);
  ctx.lineTo(xAxisVal, y1Val);
  ctx.stroke();
  for (let i = 0; i <= steps; i++) {
    const f = i / steps,
      y = y1Val - f * (y1Val - y0Val),
      lbl = (props.maxFrequency * f) / 1000;
    ctx.beginPath();
    ctx.moveTo(xAxisVal, y);
    ctx.lineTo(xAxisVal - 4, y);
    ctx.stroke();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${lbl.toFixed(lbl > 0 ? 1 : 0)}k`, xAxisVal - 6, y);
    if (i > 0 && i < steps) {
      ctx.beginPath();
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 0.5;
      ctx.moveTo(xAxisVal, y);
      ctx.lineTo(containerWidth.value - margin.value.right, y);
      ctx.stroke();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
    }
  }

  // Draw Splice Markers
  if (spliceTimes.value.length > 0 && span > 0) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; // Color for splice markers
    const markerHeight = 6;
    const markerBaseWidth = 8;
    const tipY = margin.value.top; // Tip points down to the top of spectrogram content
    const baseY = tipY - markerHeight; // Base is above the tip, in the margin area

    for (const spliceTime of spliceTimes.value) {
      if (spliceTime > v0 && spliceTime < v1) { // Check if spliceTime is within current view
        const x = x0 + ((spliceTime - v0) / span) * (x1Val - x0);
        
        ctx.beginPath();
        ctx.moveTo(x, tipY); // Tip of the triangle (points down)
        ctx.lineTo(x - markerBaseWidth / 2, baseY); // Top-left of base
        ctx.lineTo(x + markerBaseWidth / 2, baseY); // Top-right of base
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }

  ctx.restore();
}

// Playback
function getAudioContext() {
  internalAudioContext.value ??= new AudioContext();
  return internalAudioContext.value;
}

function getPlaybackRange(): { start: number; end: number } {
  let start = 0;
  let end = audioDuration.value;

  if (playInSelectionOnly.value && currentActiveSelectionRange.value) {
    start = currentActiveSelectionRange.value.start;
    end = currentActiveSelectionRange.value.end;
  } else if (
    playInViewportOnly.value &&
    spectrogramData.value.length > 0 &&
    windowSize.value > 0
  ) {
    const sIdx = Math.floor(offsetIndex.value);
    const num = Math.floor(windowSize.value);
    // Ensure eIdx is within bounds of spectrogramData
    const eIdx = Math.min(sIdx + num - 1, spectrogramData.value.length - 1);

    if (sIdx < spectrogramData.value.length && eIdx >= 0 && sIdx <= eIdx) {
      start = spectrogramData.value[sIdx]?.time ?? 0;
      // If eIdx is valid, use its time. Otherwise, if it's beyond the last data point but still within a conceptual full duration, use audioDuration.
      end = spectrogramData.value[eIdx]?.time ?? audioDuration.value;

      // If start and end are the same (e.g. very zoomed in or at the very end)
      // and it's not the absolute end of audio, try to get a minimal duration.
      if (end <= start) {
        if (eIdx + 1 < spectrogramData.value.length) {
          end = spectrogramData.value[eIdx + 1]?.time ?? audioDuration.value;
        } else {
          end = audioDuration.value; // Fallback to full duration if at the very end
        }
      }
    }
  }
  // Ensure start is not greater than end, and both are within audioDuration
  const finalStart = Math.max(0, Math.min(start, audioDuration.value));
  const finalEnd = Math.max(finalStart, Math.min(end, audioDuration.value)); // end must be >= start

  return { start: finalStart, end: finalEnd };
}

function playAudio() {
  if (props.audioElementProp) {
    const el = props.audioElementProp;
    const { start: playbackStart, end: playbackEnd } = getPlaybackRange();
    let effectiveCurrentTime = el.currentTime;

    const isSegmentActive =
      playInViewportOnly.value ||
      (playInSelectionOnly.value && currentActiveSelectionRange.value);

    if (isSegmentActive) {
      if (
        effectiveCurrentTime < playbackStart ||
        effectiveCurrentTime >= playbackEnd
      ) {
        effectiveCurrentTime = playbackStart;
      }
    }
    el.currentTime = effectiveCurrentTime;
    el.loop = false; // Manual loop for segments in onTime listener

    el.play().catch(console.error);
    // isPlaying, isPaused are handled by event listeners
    return;
  }

  if (
    !internalAudioContext.value ||
    !audioBuffer.value ||
    isPlaying.value ||
    !liveAnalyser.value ||
    !gainNode.value
  )
    return;
  if (internalAudioContext.value.state === 'suspended')
    internalAudioContext.value.resume();

  if (audioSourceNode.value) {
    audioSourceNode.value.onended = null;
    try {
      audioSourceNode.value.stop();
    } catch (e) {}
    audioSourceNode.value.disconnect();
  }

  const src = internalAudioContext.value.createBufferSource();
  src.buffer = audioBuffer.value;
  src.connect(liveAnalyser.value);
  liveAnalyser.value.connect(gainNode.value);

  const { start: playbackStart, end: playbackEnd } = getPlaybackRange();
  let effectiveCurrentTime = currentTime.value;
  const isSegmentActive =
    playInViewportOnly.value ||
    (playInSelectionOnly.value && currentActiveSelectionRange.value);

  if (isSegmentActive) {
    if (
      effectiveCurrentTime < playbackStart ||
      effectiveCurrentTime >= playbackEnd
    ) {
      effectiveCurrentTime = playbackStart;
    }
  }
  currentTime.value = effectiveCurrentTime; // Update reactive currentTime

  startTime.value =
    internalAudioContext.value.currentTime - effectiveCurrentTime;

  let playDuration = undefined;
  if (!loopPlayback.value && isSegmentActive) {
    playDuration = playbackEnd - effectiveCurrentTime;
    if (playDuration <= 0) {
      // If duration is zero or negative, don't play.
      isPlaying.value = false;
      isPaused.value = true; // Consider it paused at the start of segment
      updateProgressLinePosition();
      return;
    }
  } else if (!loopPlayback.value && !isSegmentActive) {
    // Playing full audio, not looping
    playDuration = audioDuration.value - effectiveCurrentTime;
    if (playDuration <= 0) {
      isPlaying.value = false;
      isPaused.value = true;
      updateProgressLinePosition();
      return;
    }
  }
  // If loopPlayback is true, duration is implicitly handled by loopEnd or plays indefinitely if loopEnd is past buffer.

  src.start(0, effectiveCurrentTime, playDuration);

  if (loopPlayback.value) {
    src.loop = true;
    src.loopStart = isSegmentActive ? playbackStart : 0;
    src.loopEnd = isSegmentActive ? playbackEnd : audioDuration.value;
  }

  src.onended = () => {
    if (audioSourceNode.value === src && isPlaying.value) {
      // Check if it's the current source and was supposed to be playing
      // isPlaying will be set by stopAudio
      if (!loopPlayback.value) {
        // Only if not looping, as loop shouldn't 'end' this way via onended
        const { end: currentSegmentEnd } = getPlaybackRange();
        const effectivePlaybackEnd =
          playInViewportOnly.value ||
          (playInSelectionOnly.value && currentActiveSelectionRange.value)
            ? currentSegmentEnd
            : audioDuration.value;

        // Check if currentTime is at or beyond the effective end.
        // Add a small tolerance for floating point comparisons.
        if (currentTime.value >= effectivePlaybackEnd - 0.05) {
          stopAudio(); // stopAudio handles resetting to the correct start point and state
        }
        // If it ended for other reasons (e.g. duration ran out but not at the very end of segment due to precision)
        // stopAudio will still correctly reset it.
      }
      // If looping, onended should not fire unless explicitly stopped.
    }
  };
  audioSourceNode.value = src;
  isPlaying.value = true;
  isPaused.value = false;
  requestAnimationFrame(updateLoop);
}

function pauseAudio() {
  if (props.audioElementProp) {
    props.audioElementProp.pause();
    // isPlaying, isPaused are handled by event listeners
    return;
  }
  if (!internalAudioContext.value || !isPlaying.value) return;
  if (audioSourceNode.value) {
    audioSourceNode.value.onended = null;
    try {
      audioSourceNode.value.stop();
    } catch (e) {}
  }
  isPlaying.value = false;
  isPaused.value = true;
  updateProgressLinePosition();
}

function stopAudio() {
  if (props.audioElementProp) {
    const el = props.audioElementProp;
    el.pause(); // Triggers onpause listener

    const { start: playbackStart } = getPlaybackRange();
    const isSegmentActive =
      playInViewportOnly.value ||
      (playInSelectionOnly.value && currentActiveSelectionRange.value);

    if (isSegmentActive) {
      el.currentTime = playbackStart;
    } else {
      el.currentTime = 0;
    }
    // State (isPlaying, isPaused, currentTime) is updated via event listeners from el.
    return;
  }

  if (audioSourceNode.value) {
    audioSourceNode.value.onended = null; // Important to prevent onended logic from firing due to stop()
    try {
      audioSourceNode.value.stop();
    } catch (e) {}
    audioSourceNode.value.disconnect();
    audioSourceNode.value = null;
  }
  isPlaying.value = false;
  isPaused.value = false;

  const { start: playbackStart } = getPlaybackRange();
  const isSegmentActive =
    playInViewportOnly.value ||
    (playInSelectionOnly.value && currentActiveSelectionRange.value);

  if (isSegmentActive) {
    currentTime.value = playbackStart;
  } else {
    currentTime.value = 0;
  }
  updateProgressLinePosition();
}

function seek(t: number) {
  const nt = clamp(t, 0, audioDuration.value);
  const wasPlaying = isPlaying.value;

  // If "playInSelectionOnly" is on and seek moves outside the selection, turn it off.
  if (playInSelectionOnly.value && currentActiveSelectionRange.value) {
    if (
      nt < currentActiveSelectionRange.value.start ||
      nt >= currentActiveSelectionRange.value.end
    ) {
      playInSelectionOnly.value = false;
    }
  }
  // If "playInViewportOnly" is on and seek moves outside viewport, don't turn it off,
  // but playAudio will adjust currentTime to viewport start if play is hit.

  currentTime.value = nt;

  if (props.audioElementProp) {
    props.audioElementProp.currentTime = nt;
    updateProgressLinePosition();
  } else {
    if (audioSourceNode.value) {
      audioSourceNode.value.onended = null;
      try {
        audioSourceNode.value.stop();
      } catch (e) {}
      audioSourceNode.value.disconnect();
      audioSourceNode.value = null;
    }
    isPlaying.value = false;
    isPaused.value = !(nt === 0 || nt >= audioDuration.value - 0.01);
    updateProgressLinePosition();
    if (wasPlaying) playAudio();
  }
}

function updateProgressLinePosition() {
  if (
    !isLoaded.value ||
    !spectrogramData.value.length ||
    !progressLineRef.value ||
    !canvasRef.value
  ) {
    if (progressLineRef.value && margin.value)
      progressLineRef.value.style.left = `${margin.value.left}px`;
    return;
  }
  const dispW = containerWidth.value - margin.value.left - margin.value.right;
  if (dispW <= 0) {
    progressLineRef.value.style.left = `${margin.value.left}px`;
    return;
  }
  const sIdx = Math.floor(offsetIndex.value);
  const win = Math.floor(windowSize.value);
  if (sIdx < 0 || sIdx >= spectrogramData.value.length || win <= 0) {
    progressLineRef.value.style.left = `${margin.value.left}px`;
    return;
  }
  const vs = spectrogramData.value[sIdx].time;
  const ve =
    spectrogramData.value[
      Math.min(sIdx + win - 1, spectrogramData.value.length - 1)
    ].time;
  let xPos: number;
  if (currentTime.value <= vs) xPos = margin.value.left;
  else if (currentTime.value >= ve) xPos = margin.value.left + dispW;
  else {
    const viewDuration = ve - vs;
    if (viewDuration > 0) {
      const frac = (currentTime.value - vs) / viewDuration;
      xPos = margin.value.left + frac * dispW;
    } else {
      xPos = margin.value.left;
    }
  }
  xPos = clamp(
    xPos,
    margin.value.left,
    containerWidth.value - margin.value.right
  );
  progressLineRef.value.style.left = `${xPos}px`;
}

function updateLoop() {
  if (!isPlaying.value || !internalAudioContext.value || !audioSourceNode.value)
    return;

  let newCalculatedTime =
    internalAudioContext.value.currentTime - startTime.value;

  if (loopPlayback.value && audioSourceNode.value.loop) {
    const loopStart = audioSourceNode.value.loopStart;
    const loopEnd = audioSourceNode.value.loopEnd;
    const loopDuration = loopEnd - loopStart;

    if (loopDuration > 0) {
      // Only apply loop logic if the current linear time is at or beyond the loop start point.
      if (newCalculatedTime >= loopStart) {
        const timeSinceLoopStart = newCalculatedTime - loopStart;
        const wrappedTimeInLoop = timeSinceLoopStart % loopDuration;
        newCalculatedTime = loopStart + wrappedTimeInLoop;
      }
      // If newCalculatedTime < loopStart, it means the playhead is before the loop segment begins (or was set there).
      // The linear time is correct in this case until it enters the loop segment.
    }
  }

  // Clamp to overall audio duration as a safeguard, though loop logic should keep it within its bounds.
  currentTime.value = clamp(newCalculatedTime, 0, audioDuration.value);

  if (autoScroll.value) autoScrollView();
  updateProgressLinePosition();
  requestAnimationFrame(updateLoop);
}

function onSpectrogramMouseMove(e: MouseEvent) {
  if (!canvasRef.value || !isLoaded.value) return;
  const rect = canvasRef.value.getBoundingClientRect();
  hoverLineX.value = clamp(
    e.clientX - rect.left,
    margin.value.left,
    containerWidth.value - margin.value.right
  );
}

function onSpectrogramMouseEnter() {
  showHoverLine.value = true;
}

function onCanvasMouseDown(e: MouseEvent) {
  if (e.button !== 0) return; // Only handle left-clicks here
  const cls = (e.target as HTMLElement).classList;
  if (cls.contains('progress-line') || cls.contains('range-handle')) return;

  mousedownX = e.clientX;
  mousedownTime = Date.now();

  if (isSpacebarPressed.value) {
    // Spacebar pan initiated by left-click + space
    isSpacePanningActive.value = true;
    isPanning.value = false;
    isSelecting.value = false;
    panStartX = e.clientX;
    panStartOffset = offsetIndex.value;
    document.addEventListener('mousemove', generalPanMoveHandler);
    document.addEventListener('mouseup', onSpacePanEndHandler, { once: true });
    return;
  }
  // Left-click pan when zoomed (no spacebar)
  if (zoomLevel.value > 1) {
    isPanning.value = true;
    isSpacePanningActive.value = false;
    panStartX = e.clientX;
    panStartOffset = offsetIndex.value;
    document.addEventListener('mousemove', generalPanMoveHandler);
    document.addEventListener('mouseup', onRegularPanEndHandler, {
      once: true
    });
  }
  // If not spacebar panning and not zoomed-in panning, left click might start selection via onRangeSelectStart
  // or be a zoom click via onCanvasClick.
}

function onCanvasClick(e: MouseEvent) {
  if (e.button !== 0) return;
  if (
    isSpacePanningActive.value ||
    isPanning.value ||
    isDraggingProgress.value ||
    draggingRangeId.value !== null ||
    isSelecting.value ||
    isMiddleClickPanning.value
  )
    return; // Added isMiddleClickPanning
  const isSimpleClick =
    Date.now() - mousedownTime < CLICK_THRESHOLD_MS &&
    Math.abs(e.clientX - mousedownX) < CLICK_THRESHOLD_PX;
  if (isSimpleClick && zoomLevel.value === MIN_ZOOM_LEVEL) { // Changed from DEFAULT_BASE_ZOOM
    onZoomClick(e);
  }
}

// PROGRESS DRAG
function onProgressDragStart(e: MouseEvent) {
  if (!isLoaded.value || e.button !== 0) return;
  isDraggingProgress.value = true;
  document.body.style.cursor = 'col-resize';
  document.addEventListener('mousemove', onProgressDragMove);
  document.addEventListener('mouseup', onProgressDragEndHandler, {
    once: true
  });
}
function onProgressDragMove(e: MouseEvent) {
  if (!isDraggingProgress.value || !canvasRef.value || !progressLineRef.value)
    return;
  const rect = canvasRef.value.getBoundingClientRect();
  const x = clamp(
    e.clientX - rect.left,
    margin.value.left,
    containerWidth.value - margin.value.right
  );
  progressLineRef.value.style.left = `${x}px`;
  const dispW = containerWidth.value - margin.value.left - margin.value.right;
  if (dispW <= 0) return;
  const f = clamp((x - margin.value.left) / dispW, 0, 1);
  const sIdx = Math.floor(offsetIndex.value);
  const win = Math.floor(windowSize.value);
  const eIdx = Math.min(sIdx + win, spectrogramData.value.length);
  if (sIdx < eIdx && sIdx >= 0 && sIdx < spectrogramData.value.length) {
    const vs = spectrogramData.value[sIdx].time;
    const ve = spectrogramData.value[Math.max(sIdx, eIdx - 1)].time;
    const dur = ve - vs;
    if (dur > 0)
      currentTime.value = clamp(vs + f * dur, 0, audioDuration.value);
  }
}
function onProgressDragEndHandler(e: MouseEvent) {
  document.removeEventListener('mousemove', onProgressDragMove);
  document.body.style.cursor = 'default';
  if (!isDraggingProgress.value) return;
  isDraggingProgress.value = false;
  if (canvasRef.value) {
    const rect = canvasRef.value.getBoundingClientRect();
    const x = clamp(
      e.clientX - rect.left,
      margin.value.left,
      containerWidth.value - margin.value.right
    );
    const dispW = containerWidth.value - margin.value.left - margin.value.right;
    if (dispW > 0) {
      const f = clamp((x - margin.value.left) / dispW, 0, 1);
      const sIdx = Math.floor(offsetIndex.value);
      const win = Math.floor(windowSize.value);
      const eIdx = Math.min(sIdx + win, spectrogramData.value.length);
      if (sIdx < eIdx && sIdx >= 0 && sIdx < spectrogramData.value.length) {
        const vs = spectrogramData.value[sIdx].time;
        const ve = spectrogramData.value[Math.max(sIdx, eIdx - 1)].time;
        const dur = ve - vs;
        if (dur > 0) seek(vs + f * dur);
        else if (audioDuration.value > 0) seek(f * audioDuration.value);
      }
    }
  }
}

// RANGE SELECT
function onRangeSelectStart(e: MouseEvent) {
  if (!isLoaded.value || !canvasRef.value) return; // Basic checks

  // Middle mouse button for panning
  if (e.button === 1) {
    isMiddleClickPanning.value = true;
    isPanning.value = false; // Ensure other pan/select modes are off
    isSpacePanningActive.value = false;
    isSelecting.value = false;

    panStartX = e.clientX;
    panStartOffset = offsetIndex.value;
    document.addEventListener('mousemove', generalPanMoveHandler);
    document.addEventListener('mouseup', onMiddleClickPanEndHandler, {
      once: true
    });
    return; // Middle click handled
  }

  // Existing logic for left-click (e.button === 0)
  if (e.button !== 0) return; // Ensure only left click proceeds from here for selection/space-pan

  // Set mousedown time and position for potential click detection in onRangeSelectEndHandler
  // This needs to be done before any early returns for left-clicks that should lead to onRangeSelectEndHandler.
  mousedownX = e.clientX;
  mousedownTime = Date.now();

  const tgt = e.target as HTMLElement;
  if (
    tgt.classList.contains('range-handle') ||
    tgt.classList.contains('progress-line')
  ) {
    // These elements have their own mousedown handlers.
    // Do not proceed with selection or click-to-seek via this path.
    return;
  }

  // If spacebar is pressed, initiate space panning. This takes precedence over selection/click.
  if (isSpacebarPressed.value) {
    isSpacePanningActive.value = true;
    isPanning.value = false;
    isSelecting.value = false; // Ensure selection is off
    panStartX = e.clientX;
    panStartOffset = offsetIndex.value;
    document.addEventListener('mousemove', generalPanMoveHandler);
    document.addEventListener('mouseup', onSpacePanEndHandler, { once: true });
    return;
  }

  // If readonly, we don't start a selection (isSelecting.value remains false).
  // But we still need to listen for mouseup to handle a potential click-to-seek.
  if (props.readonly) {
    document.addEventListener('mouseup', onRangeSelectEndHandler, { once: true });
    return; // Do not proceed to selection initiation logic
  }

  // If not readonly and not spacebar panning, and not on a specific handle, proceed to start selection.
  // This is where nextRangeColor was, but it's moved to range creation.
  const rect = canvasRef.value.getBoundingClientRect();
  selectStartXPx.value = clamp(
    e.clientX - rect.left,
    margin.value.left,
    containerWidth.value - margin.value.right
  );
  selectCurrentXPx.value = selectStartXPx.value;
  isSelecting.value = true; // Mark that selection process has started
  document.addEventListener('mousemove', onRangeSelectMoveHandler);
  document.addEventListener('mouseup', onRangeSelectEndHandler, { once: true });
}

function onRangeSelectMoveHandler(e: MouseEvent) {
  if (!isSelecting.value || !canvasRef.value) return;
  const rect = canvasRef.value.getBoundingClientRect();
  selectCurrentXPx.value = clamp(
    e.clientX - rect.left,
    margin.value.left,
    containerWidth.value - margin.value.right
  );
}

function onRangeSelectEndHandler(e: MouseEvent) {
  // Always remove the mousemove listener if it could have been added.
  // It's safe because removeEventListener on a non-added listener is a no-op.
  document.removeEventListener('mousemove', onRangeSelectMoveHandler);

  const wasSelectionProcessActive = isSelecting.value; // Check if selection was initiated
  isSelecting.value = false; // Always reset selection state on mouseup

  const isClick =
    Date.now() - mousedownTime < CLICK_THRESHOLD_MS &&
    Math.abs(e.clientX - mousedownX) < CLICK_THRESHOLD_PX;

  // Handle range creation if a selection process was active, not readonly, and it's a drag.
  if (wasSelectionProcessActive && !props.readonly) {
    const x0 = Math.min(selectStartXPx.value, selectCurrentXPx.value);
    const x1 = Math.max(selectStartXPx.value, selectCurrentXPx.value);

    if (x1 - x0 >= CLICK_THRESHOLD_PX) { // If it was a drag, not a simple click
      const dispW =
        containerWidth.value - margin.value.left - margin.value.right;
      if (dispW > 0 && canvasRef.value && spectrogramData.value.length > 0) {
        const f0 = clamp((x0 - margin.value.left) / dispW, 0, 1);
        const f1 = clamp((x1 - margin.value.left) / dispW, 0, 1);
        const sIdx = Math.floor(offsetIndex.value);
        const win = Math.floor(windowSize.value);
        const eIdx = Math.min(sIdx + win, spectrogramData.value.length);
        if (sIdx < eIdx && sIdx >= 0 && sIdx < spectrogramData.value.length) {
          const vs = spectrogramData.value[sIdx].time;
          const ve =
            spectrogramData.value[
              Math.min(eIdx - 1, spectrogramData.value.length - 1)
            ].time;
          const dur = ve - vs;
          if (dur > 0) {
            const usedColor = nextRangeColor.value;
            ranges.value.push({
              id: Date.now() + Math.random(),
              start: vs + f0 * dur,
              end: vs + f1 * dur,
              color: usedColor
            });
            // now generate a fresh color for the *next* range
            nextRangeColor.value = `hsla(${Math.random() * 360},70%,50%,0.4)`;
          }
        }
      }
      return; // Range created, so don't fall through to click-to-seek
    }
  }

  // Fallback to click-to-seek if it was a simple click.
  // This will now execute in readonly mode if it's a click,
  // or in non-readonly mode if the "selection" was too small (i.e., a click).
  if (
    isClick &&
    !isSpacePanningActive.value && // Ensure not part of a space pan
    !isSpacebarPressed.value &&    // Redundant if isSpacePanningActive is true, but safe
    canvasRef.value
    // No !props.readonly check here, allowing seek in readonly mode
  ) {
    const rect = canvasRef.value.getBoundingClientRect();
    const clickX = clamp(
      mousedownX - rect.left, // Use mousedownX for the click position
      margin.value.left,
      containerWidth.value - margin.value.right
    );
    const dispW = containerWidth.value - margin.value.left - margin.value.right;
    if (dispW > 0 && spectrogramData.value.length > 0) {
      const f = clamp((clickX - margin.value.left) / dispW, 0, 1);
      const sIdx = Math.floor(offsetIndex.value);
      const win = Math.floor(windowSize.value);
      const eIdx = Math.min(sIdx + win, spectrogramData.value.length);
      if (sIdx < eIdx && sIdx >= 0 && sIdx < spectrogramData.value.length) {
        const vs = spectrogramData.value[sIdx].time;
        const ve =
          spectrogramData.value[
            Math.min(eIdx - 1, spectrogramData.value.length - 1)
          ].time;
        const dur = ve - vs;
        if (dur > 0) seek(vs + f * dur);
        else if (audioDuration.value > 0) seek(f * audioDuration.value); // Fallback for zero duration view
      }
    }
  }
}

// HANDLE DRAG
function onHandleMouseDown(id: number, handle: 'start' | 'end') {
  if (props.readonly) return; // Prevent dragging in readonly mode
  draggingRangeId.value = id;
  draggingHandle.value = handle;
  document.body.style.cursor = 'col-resize';
  document.addEventListener('mousemove', onHandleMouseMoveHandler);
  document.addEventListener('mouseup', onHandleMouseUpHandler, { once: true });
}
function onHandleMouseMoveHandler(e: MouseEvent) {
  if (draggingRangeId.value === null || !canvasRef.value) return;
  const r_item = ranges.value.find((r) => r.id === draggingRangeId.value);
  if (!r_item) return;

  const rect = canvasRef.value.getBoundingClientRect();
  const x = clamp(
    e.clientX - rect.left,
    margin.value.left,
    containerWidth.value - margin.value.right
  );
  const dispW = containerWidth.value - margin.value.left - margin.value.right;
  if (dispW <= 0) return;

  const f = clamp((x - margin.value.left) / dispW, 0, 1);
  const sIdx = Math.floor(offsetIndex.value);
  const win = Math.floor(windowSize.value);
  const eIdx = Math.min(sIdx + win, spectrogramData.value.length);

  if (sIdx < eIdx && sIdx >= 0 && sIdx < spectrogramData.value.length) {
    const vs = spectrogramData.value[sIdx].time;
    const ve = spectrogramData.value[Math.max(sIdx, eIdx - 1)].time; // Corrected index for ve
    const dur = ve - vs;

    if (dur > 0) {
      const nt = clamp(vs + f * dur, 0, audioDuration.value); // Clamp new time to overall audio duration

      if (draggingHandle.value === 'start') {
        if (nt > r_item.end) { // Dragged start past current end
          const originalEnd = r_item.end;
          r_item.end = nt;
          r_item.start = originalEnd;
          draggingHandle.value = 'end'; // Switched roles
        } else {
          r_item.start = nt;
        }
      } else if (draggingHandle.value === 'end') {
        if (nt < r_item.start) { // Dragged end past current start
          const originalStart = r_item.start;
          r_item.start = nt;
          r_item.end = originalStart;
          draggingHandle.value = 'start'; // Switched roles
        } else {
          r_item.end = nt;
        }
      }
    }
  }
}
function onHandleMouseUpHandler() {
  document.removeEventListener('mousemove', onHandleMouseMoveHandler);
  document.body.style.cursor = 'default';
  draggingRangeId.value = null;
  draggingHandle.value = null;
}

// ZOOM & PAN
function updateZoom(newZoom: number, centerPx?: number) {
  const total = spectrogramData.value.length;
  if (!isLoaded.value || !total) return;
  newZoom = clamp(newZoom, MIN_ZOOM_LEVEL, maxZoomLevel.value); // Use MIN_ZOOM_LEVEL
  const dispW = containerWidth.value - margin.value.left - margin.value.right;
  let cf = 0.5;
  if (centerPx !== undefined && dispW > 0)
    cf = clamp((centerPx - margin.value.left) / dispW, 0, 1);

  const oldWin = windowSize.value;
  const oldOff = offsetIndex.value;
  const centerIdxInTotal = oldOff + cf * oldWin;

  zoomLevel.value = newZoom;
  // Corrected newWin calculation: use MIN_COLS_AT_MAX_ZOOM_DISPLAY as the floor
  const newWin = Math.max(
    MIN_COLS_AT_MAX_ZOOM_DISPLAY,
    Math.floor(total / newZoom)
  );
  let newOff = Math.floor(centerIdxInTotal - cf * newWin);
  newOff = clamp(newOff, 0, Math.max(0, total - newWin));
  windowSize.value = newWin;
  offsetIndex.value = newOff;

  renderSpectrogram();
}

function onSliderInput(e: Event) {
  updateZoom(+(e.target as HTMLInputElement).value); // This will be removed as slider uses zoomThumb
}

function onZoomClick(e: MouseEvent) {
  if (!canvasRef.value || !isLoaded.value || zoomLevel.value !== MIN_ZOOM_LEVEL) return; // Check against MIN_ZOOM_LEVEL
  const rect = canvasRef.value.getBoundingClientRect();
  const x = clamp(
    e.clientX - rect.left,
    margin.value.left,
    containerWidth.value - margin.value.right
  );
  // Zoom in to DEFAULT_BASE_ZOOM or a bit more if already there, capped by maxZoomLevel
  const targetZoom = DEFAULT_BASE_ZOOM; // Zoom to the default initial view
  updateZoom(targetZoom, x);
}

function generalPanMoveHandler(e: MouseEvent) {
  if (
    !isPanning.value &&
    !isSpacePanningActive.value &&
    !isMiddleClickPanning.value
  )
    return; // Added isMiddleClickPanning
  const dx = e.clientX - panStartX;
  const dispW = containerWidth.value - margin.value.left - margin.value.right;
  if (dispW <= 0 || windowSize.value <= 0 || spectrogramData.value.length === 0)
    return;
  const colsPerPx = windowSize.value / dispW;
  const targetOffset = panStartOffset - dx * colsPerPx;
  offsetIndex.value = clamp(
    targetOffset,
    0,
    spectrogramData.value.length - windowSize.value
  );
  renderSpectrogram();
}

function onRegularPanEndHandler() {
  document.removeEventListener('mousemove', generalPanMoveHandler);
  isPanning.value = false;
}
function onSpacePanEndHandler() {
  document.removeEventListener('mousemove', generalPanMoveHandler);
  isSpacePanningActive.value = false;
}

// New handler for middle click pan end
function onMiddleClickPanEndHandler() {
  document.removeEventListener('mousemove', generalPanMoveHandler);
  isMiddleClickPanning.value = false;
  // Cursor should update via computed properties
}

// SPACEBAR
function onSpacebarDown() {
  isSpacebarPressed.value = true;
}
function onSpacebarUp() {
  isSpacebarPressed.value = false;
}

// AUTO SCROLL
function autoScrollView() {
  if (
    !autoScroll.value ||
    windowSize.value <= 0 ||
    !spectrogramData.value.length
  )
    return;
  const idx = timeToIndex(currentTime.value);
  const half = Math.floor(windowSize.value / 2);
  let off = idx - half;
  off = clamp(off, 0, spectrogramData.value.length - windowSize.value);
  if (off !== offsetIndex.value) {
    offsetIndex.value = off;
    renderSpectrogram();
  }
}

// EXTERNAL AUDIO
let cleanupAudioListeners: (() => void) | undefined;
function setupAudioElementListeners() {
  const el = props.audioElementProp;
  if (!el) return;
  const onPlay = () => {
    isPlaying.value = true;
    isPaused.value = false;
    requestAnimationFrame(updateLoopExternalAudio);
  };
  const onPause = () => {
    isPlaying.value = false;
    isPaused.value = true;
    // When paused, if it was due to segment end (non-looping), reset to segment start
    const { start: segmentStart, end: segmentEnd } = getPlaybackRange();
    const isSegmentActive =
      playInViewportOnly.value ||
      (playInSelectionOnly.value && currentActiveSelectionRange.value);
    if (
      isSegmentActive &&
      !loopPlayback.value &&
      el.currentTime >= segmentEnd - 0.05
    ) {
      el.currentTime = segmentStart;
      if (
        playInSelectionOnly.value &&
        currentActiveSelectionRange.value &&
        segmentStart === currentActiveSelectionRange.value.start
      ) {
        // playInSelectionOnly.value = false; // Kept as per original behavior if desired
      }
    }
    updateProgressLinePosition();
  };
  const onEnded = () => {
    isPlaying.value = false;

    const { start: segmentStart } = getPlaybackRange();
    const isSegmentActive =
      playInViewportOnly.value ||
      (playInSelectionOnly.value && currentActiveSelectionRange.value);

    // Playback has ended. Reset position to the start of the context it was playing in.
    // Looping should be handled by onTime. This is a final state reset.
    if (isSegmentActive) {
      el.currentTime = segmentStart;
    } else {
      el.currentTime = 0;
    }

    // Update isPaused state
    if (
      el.currentTime === 0 &&
      (!isSegmentActive || segmentStart === 0) &&
      el.duration > 0
    ) {
      isPaused.value = false; // Stopped at the very beginning of playable content
    } else if (el.duration > 0 && el.currentTime < el.duration) {
      isPaused.value = true; // Stopped somewhere in the middle or at segment start
    } else {
      // Duration is 0 or currentTime is at/beyond duration (unlikely for ended)
      isPaused.value = false;
    }

    updateProgressLinePosition();
  };
  const onTime = () => {
    if (!isDraggingProgress.value && props.audioElementProp) {
      const currentAudioElement = props.audioElementProp; // Use a local const for clarity

      // Determine looping parameters based on state from *previous* tick or stable settings.
      // This uses currentTime.value as it was BEFORE this onTime event processed currentAudioElement.currentTime.
      const { start: determinedRangeStart, end: determinedRangeEnd } =
        getPlaybackRange();
      // currentActiveSelectionRange (used by getPlaybackRange if playInSelectionOnly) is also based on previous currentTime.value.
      const isPlayingInDeterminedSegment =
        playInViewportOnly.value ||
        (playInSelectionOnly.value && currentActiveSelectionRange.value);

      let currentElementTime = currentAudioElement.currentTime; // Read current physical time of the audio element

      if (isPlaying.value && loopPlayback.value) {
        if (
          isPlayingInDeterminedSegment &&
          currentElementTime >= determinedRangeEnd - 0.015
        ) {
          currentElementTime = determinedRangeStart;
          currentAudioElement.currentTime = currentElementTime; // Apply loop to element
          if (currentAudioElement.paused)
            currentAudioElement.play().catch(console.error);
        } else if (
          !isPlayingInDeterminedSegment &&
          currentElementTime >= audioDuration.value - 0.015
        ) {
          currentElementTime = 0;
          currentAudioElement.currentTime = currentElementTime; // Apply loop to element
          if (currentAudioElement.paused)
            currentAudioElement.play().catch(console.error);
        }
      }

      // Update reactive currentTime with the (potentially looped) element time.
      currentTime.value = currentElementTime;
      // Now, computed properties like currentActiveSelectionRange might recompute if currentTime.value changed significantly.

      // Update visuals and other logic based on the NEW currentTime.value.
      updateProgressLinePosition();

      // Handle non-looping segment end using the same determined range for consistency within this tick.
      if (
        isPlaying.value &&
        !loopPlayback.value &&
        isPlayingInDeterminedSegment &&
        currentTime.value >= determinedRangeEnd - 0.015
      ) {
        currentAudioElement.pause(); // This will trigger the onPause handler.
      }

      if (autoScroll.value) autoScrollView(); // autoScrollView uses the new currentTime.value.
    }
  };
  const onSeek = () => {
    currentTime.value = el.currentTime;
    if (playInSelectionOnly.value && currentActiveSelectionRange.value) {
      if (
        el.currentTime < currentActiveSelectionRange.value.start ||
        el.currentTime >= currentActiveSelectionRange.value.end
      ) {
        playInSelectionOnly.value = false;
      }
    }
    updateProgressLinePosition();
  };
  const onLoad = () => {
    audioDuration.value = el.duration || 0;
    updateProgressLinePosition();
  };

  el.addEventListener('play', onPlay);
  el.addEventListener('pause', onPause);
  el.addEventListener('ended', onEnded);
  el.addEventListener('timeupdate', onTime);
  el.addEventListener('seeked', onSeek);
  el.addEventListener('loadeddata', onLoad);

  if (!el.paused) onPlay();
  else onPause();
  currentTime.value = el.currentTime;
  audioDuration.value = el.duration || 0;
  updateProgressLinePosition();

  return () => {
    el.removeEventListener('play', onPlay);
    el.removeEventListener('pause', onPause);
    el.removeEventListener('ended', onEnded);
    el.removeEventListener('timeupdate', onTime);
    el.removeEventListener('seeked', onSeek);
    el.removeEventListener('loadeddata', onLoad);
  };
}

function updateLoopExternalAudio() {
  if (
    !props.audioElementProp ||
    props.audioElementProp.paused ||
    !isPlaying.value
  )
    return;
  // Segment boundary checks for external audio are primarily in the 'timeupdate' (onTime) listener.
  // currentTime is updated by onTime, which also calls autoScrollView if enabled.
  // So, direct call to autoScrollView here might be redundant if onTime is frequent enough,
  // but keeping it ensures responsiveness if onTime events are sparse.
  if (autoScroll.value) autoScrollView();
  updateProgressLinePosition(); // Ensure progress line is updated in this loop too.
  requestAnimationFrame(updateLoopExternalAudio);
}

// LIFECYCLE
onMounted(() => {
  if (spectrogramContainerRef.value) spectrogramContainerRef.value.focus();
  if (props.audioElementProp)
    cleanupAudioListeners = setupAudioElementListeners();
  loadAndProcessAudio();
  if (spectrogramContainerRef.value) {
    resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(spectrogramContainerRef.value);
    spectrogramContainerRef.value.addEventListener('wheel', onWheel, {
      passive: false
    });
  }
  window.addEventListener('resize', handleResize, { passive: true });
  window.addEventListener('keydown', handleEscapeKey); // Add escape key listener
  handleResize();
});

onUnmounted(() => {
  // 1. Reset and clean up audio-specific resources and state
  resetAndCleanupAudioResources();

  // 2. Remove event listeners bound to window, document, or component's root element
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('keydown', handleEscapeKey);
  if (spectrogramContainerRef.value) { // Check if ref still exists
    spectrogramContainerRef.value.removeEventListener('wheel', onWheel);
  }

  // Global listeners for UI interactions (context menu, tooltips, drags)
  document.removeEventListener('click', closeContextMenuOnClickOutside);
  document.removeEventListener('contextmenu', closeContextMenuOnClickOutside);
  document.removeEventListener('click', handleClickOutsideRangeTooltipOnCapture, true);

  document.removeEventListener('mousemove', generalPanMoveHandler);
  document.removeEventListener('mouseup', onRegularPanEndHandler);
  document.removeEventListener('mouseup', onSpacePanEndHandler);
  document.removeEventListener('mouseup', onMiddleClickPanEndHandler);
  document.removeEventListener('mousemove', onProgressDragMove);
  document.removeEventListener('mouseup', onProgressDragEndHandler);
  document.removeEventListener('mousemove', onRangeSelectMoveHandler);
  document.removeEventListener('mouseup', onRangeSelectEndHandler);
  document.removeEventListener('mousemove', onHandleMouseMoveHandler);
  document.removeEventListener('mouseup', onHandleMouseUpHandler);
  document.removeEventListener('mousemove', onPanThumbMouseMove);
  document.removeEventListener('mouseup', onPanThumbMouseUp);
  document.removeEventListener('mousemove', onZoomThumbMouseMove);
  document.removeEventListener('mouseup', onZoomThumbMouseUp);

  // 3. Disconnect observers
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }

  // 4. Clean up listeners for external audio element (if any were set up)
  if (cleanupAudioListeners) {
    cleanupAudioListeners();
    cleanupAudioListeners = undefined;
  }

  // 5. Nullify refs to DOM elements (Vue 3 usually handles this, but explicit can be safer for complex cases)
  canvasRef.value = null;
  spectrogramContainerRef.value = null; // Already checked above for listener removal
  progressLineRef.value = null;
  contextMenuRef.value = null;
  rangeTooltipRef.value = null;
  panTrackRef.value = null;
  zoomTrackRef.value = null;
});

// Rewind All Function
function rewindToAbsoluteStart() {
  stopAudio();
  currentTime.value = 0;
  offsetIndex.value = 0;
  if (spectrogramData.value.length > 0) {
    zoomLevel.value = DEFAULT_BASE_ZOOM;
    // Corrected windowSize calculation here as well for consistency
    windowSize.value = Math.max(
      MIN_COLS_AT_MAX_ZOOM_DISPLAY,
      Math.floor(spectrogramData.value.length / zoomLevel.value)
    );
    offsetIndex.value = clamp(
      offsetIndex.value,
      0,
      Math.max(0, spectrogramData.value.length - windowSize.value)
    );
  }

  playInViewportOnly.value = false;
  playInSelectionOnly.value = false;
  loopPlayback.value = false;
  autoScroll.value = false; // Reset autoScroll as well

  updateProgressLinePosition();
  renderSpectrogram();
  if (props.audioElementProp) {
    // Ensure external audio element also reflects this
    props.audioElementProp.currentTime = 0;
  }
}

// CURSOR CLASSES
const canvasCursorClass = computed(() => ({
  'cursor-grabbing':
    isPanning.value || isSpacePanningActive.value || isMiddleClickPanning.value,
  'cursor-grab':
    (zoomLevel.value > MIN_ZOOM_LEVEL && // Changed from > 1
      !isPanning.value &&
      !isMiddleClickPanning.value &&
      !isDraggingProgress.value &&
      draggingRangeId.value === null &&
      !isSpacePanningActive.value &&
      !isSelecting.value &&
      !autoScroll.value) || 
    (isSpacebarPressed.value &&
      !isSpacePanningActive.value &&
      !isMiddleClickPanning.value &&
      !autoScroll.value),
  'cursor-zoom-in':
    zoomLevel.value === MIN_ZOOM_LEVEL && // Changed from === 1
    !isPanning.value &&
    !isMiddleClickPanning.value &&
    !isDraggingProgress.value &&
    draggingRangeId.value === null &&
    !isSpacebarPressed.value &&
    !isSelecting.value &&
    !autoScroll.value,
  'cursor-col-resize':
    isDraggingProgress.value || draggingRangeId.value !== null,
  'cursor-crosshair':
    !isSpacebarPressed.value &&
    !isSpacePanningActive.value &&
    !isMiddleClickPanning.value &&
    zoomLevel.value === MIN_ZOOM_LEVEL && // Changed from === 1
    !isDraggingProgress.value &&
    draggingRangeId.value === null &&
    !isSelecting.value &&
    !isPanning.value &&
    !autoScroll.value, // Ensure not panning and not autoScroll
  'cursor-default': autoScroll.value // Default cursor when autoScroll is active and no other specific cursor applies
}));
const overlayCursorClass = computed(() => ({
  'cursor-grabbing': isSpacePanningActive.value || isMiddleClickPanning.value,
  'cursor-grab':
    isSpacebarPressed.value &&
    !isSpacePanningActive.value &&
    !isMiddleClickPanning.value &&
    !autoScroll.value, // Grab for space pan (overlay)
  'cursor-crosshair':
    !isSpacebarPressed.value &&
    !isSpacePanningActive.value &&
    !isMiddleClickPanning.value &&
    !isSelecting.value &&
    !isPanning.value &&
    !autoScroll.value, // Ensure not panning and not autoScroll
  'cursor-default': autoScroll.value // Default cursor when autoScroll is active and no other specific cursor applies
}));

// WHEEL ZOOM/PAN
function onWheel(e: WheelEvent) {
  if (!isLoaded.value || !canvasRef.value || !spectrogramContainerRef.value)
    return;
  e.preventDefault();

  if (e.altKey) {
    // Panning with Alt + Wheel
    const panDirection = Math.sign(e.deltaY);
    // Pan sensitivity: Pan 5% of current window size or at least 1 data point.
    const panStep = Math.max(1, Math.floor(windowSize.value * 0.05));
    const panAmount = panDirection * panStep;

    const newOffsetIndex = offsetIndex.value + panAmount;
    const maxOffset =
      spectrogramData.value.length > windowSize.value
        ? spectrogramData.value.length - windowSize.value
        : 0;

    offsetIndex.value = clamp(newOffsetIndex, 0, maxOffset);
    renderSpectrogram();
  } else {
    // Zooming with Wheel
    const rect = canvasRef.value.getBoundingClientRect();
    const mouseXOnCanvas = e.clientX - rect.left;

    // Zoom factor: 10% zoom in/out per wheel tick
    const zoomFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const newZoom = zoomLevel.value * zoomFactor;

    updateZoom(newZoom, mouseXOnCanvas);
  }
}

// Watchers on props.audioUrls and props.audioElementProp (unchanged)
watch(
  () => props.audioUrls,
  (newUrls, oldUrls) => {
    const newArr = Array.isArray(newUrls) ? newUrls : [newUrls];
    const oldArr = Array.isArray(oldUrls) ? oldUrls : [oldUrls];
    if (
      newArr.length === oldArr.length &&
      newArr.every((u, i) => u === oldArr[i])
    ) {
      return;
    }

    resetAndCleanupAudioResources();
    // isLoading will be set to true by loadAndProcessAudio
    loadAndProcessAudio();
  },
  { deep: true }
);

watch(
  () => props.audioElementProp,
  (newEl, oldEl) => {
    if (oldEl && cleanupAudioListeners) {
      cleanupAudioListeners();
      cleanupAudioListeners = undefined;
    }
    if (newEl) {
      cleanupAudioListeners = setupAudioElementListeners();
      currentTime.value = newEl.currentTime;
      audioDuration.value = newEl.duration || 0;
      isPlaying.value = !newEl.paused;
      isPaused.value = newEl.paused;

      // When audioElementProp is set, close internal tooltips/menus
      closeContextMenu();
      closeRangeTooltip();

      updateProgressLinePosition();
      if (isPlaying.value) requestAnimationFrame(updateLoopExternalAudio);
    } else {
      stopAudio();
      if (internalAudioContext.value && !liveAnalyser.value) {
        liveAnalyser.value = internalAudioContext.value.createAnalyser();
        liveAnalyser.value.fftSize = 2048;
      }
      if (
        internalAudioContext.value?.destination &&
        !gainNode.value
      ) {
        gainNode.value = internalAudioContext.value.createGain();
        gainNode.value.gain.value = 1;
        gainNode.value.connect(internalAudioContext.value.destination);
      }
    }
  },
  { immediate: false }
);

// New Playback Options
const panTrackRef = ref<HTMLElement | null>(null);
const zoomTrackRef = ref<HTMLElement | null>(null);
const panTrackDOMWidth = ref(0);
const zoomTrackDOMWidth = ref(0);

const isDraggingPanThumb = ref(false);
const isDraggingZoomThumb = ref(false);
let panDragStartX = 0;
let panDragInitialOffset = 0;
let zoomDragStartX = 0;
// let zoomDragInitialLevel = 0; // No longer needed for log zoom
let zoomDragInitialLogZoom = 0; // For logarithmic zoom dragging

const Z_THUMB_W = 16; // Width of the zoom thumb (w-4 class -> 1rem -> 16px)

const maxOffsetIndex = computed(() =>
  Math.max(0, spectrogramData.value.length - windowSize.value)
);

const panThumbWidthPx = computed(() => {
  if (!panTrackDOMWidth.value || !spectrogramData.value.length || !windowSize.value) {
    return panTrackDOMWidth.value; // Full width if no data or track
  }
  const ratio = Math.min(1, windowSize.value / spectrogramData.value.length);
  return Math.max(10, ratio * panTrackDOMWidth.value); // Min width 10px
});

const panThumbLeftPx = computed(() => {
  if (
    !panTrackDOMWidth.value ||
    maxOffsetIndex.value <= 0 ||
    panThumbWidthPx.value >= panTrackDOMWidth.value
  ) {
    return 0;
  }
  const scrollableTrackWidth = panTrackDOMWidth.value - panThumbWidthPx.value;
  const ratio = offsetIndex.value / maxOffsetIndex.value;
  return ratio * scrollableTrackWidth;
});

const panThumbStyle = computed(() => ({
  width: `${panThumbWidthPx.value}px`,
  left: `${panThumbLeftPx.value}px`,
  cursor: isDraggingPanThumb.value ? 'grabbing' : 'grab'
}));

const zoomRange = computed(() => Math.max(0, maxZoomLevel.value - MIN_ZOOM_LEVEL)); // Use MIN_ZOOM_LEVEL

// Logarithmic scale constants for zoom
const LOG_MIN_ZOOM_LEVEL_EFFECTIVE = computed(() => Math.log(MIN_ZOOM_LEVEL));
const LOG_MAX_ZOOM_LEVEL_EFFECTIVE = computed(() => Math.log(maxZoomLevel.value));

const LOG_ZOOM_RANGE_EFFECTIVE = computed(() => {
  const logMin = LOG_MIN_ZOOM_LEVEL_EFFECTIVE.value;
  const logMax = LOG_MAX_ZOOM_LEVEL_EFFECTIVE.value;
  return Math.max(0, logMax - logMin);
});

const normalizedZoom = computed(() => {
  if (LOG_ZOOM_RANGE_EFFECTIVE.value <= 1e-9) { // Handle zero or very small log range
    return 0; 
  }
  const currentLogZoom = Math.log(zoomLevel.value);
  return clamp(
    (currentLogZoom - LOG_MIN_ZOOM_LEVEL_EFFECTIVE.value) / LOG_ZOOM_RANGE_EFFECTIVE.value,
    0,
    1
  );
});

const zoomThumbLeftPx = computed(() => {
  if (!zoomTrackDOMWidth.value) return 0;
  const scrollableTrackWidth = zoomTrackDOMWidth.value - Z_THUMB_W;
  if (scrollableTrackWidth <= 0) return 0;
  return normalizedZoom.value * scrollableTrackWidth;
});

const zoomThumbStyle = computed(() => ({
  left: `${zoomThumbLeftPx.value}px`,
  cursor: isDraggingZoomThumb.value ? 'grabbing' : 'grab',
  width: `${Z_THUMB_W}px`
}));

const centerPxToMaintainForZoom = computed(() => {
  const drawWidth = containerWidth.value - margin.value.left - margin.value.right;
  if (drawWidth <= 0) return margin.value.left;
  return margin.value.left + drawWidth / 2;
});

function onPanThumbMouseDown(e: MouseEvent) {
  if (!isLoaded.value || maxOffsetIndex.value <= 0) return;
  isDraggingPanThumb.value = true;
  panDragStartX = e.clientX;
  panDragInitialOffset = offsetIndex.value;
  document.addEventListener('mousemove', onPanThumbMouseMove);
  document.addEventListener('mouseup', onPanThumbMouseUp, { once: true });
}

function onPanThumbMouseMove(e: MouseEvent) {
  if (!isDraggingPanThumb.value || !panTrackRef.value) return;
  const deltaX = e.clientX - panDragStartX;
  const scrollableTrackWidth = panTrackDOMWidth.value - panThumbWidthPx.value;
  if (scrollableTrackWidth <= 0) return;

  const offsetChangeRatio = deltaX / scrollableTrackWidth;
  const newOffset = panDragInitialOffset + offsetChangeRatio * maxOffsetIndex.value;
  offsetIndex.value = clamp(newOffset, 0, maxOffsetIndex.value);
  renderSpectrogram();
}

function onPanThumbMouseUp() {
  isDraggingPanThumb.value = false;
  document.removeEventListener('mousemove', onPanThumbMouseMove);
}

function onPanTrackMouseDown(e: MouseEvent) {
  if (!isLoaded.value || !panTrackRef.value || maxOffsetIndex.value <= 0) return;
  if (e.target !== panTrackRef.value && e.target !== panTrackRef.value.firstChild) return; // Allow click on track or regions

  const rect = panTrackRef.value.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const scrollableTrackWidth = panTrackDOMWidth.value - panThumbWidthPx.value;
  if (scrollableTrackWidth <= 0) return;

  const targetThumbStartX = clickX - panThumbWidthPx.value / 2;
  const newOffsetRatio = clamp(targetThumbStartX / scrollableTrackWidth, 0, 1);
  offsetIndex.value = clamp(
    newOffsetRatio * maxOffsetIndex.value,
    0,
    maxOffsetIndex.value
  );
  renderSpectrogram();
}

function onZoomThumbMouseDown(e: MouseEvent) {
  if (!isLoaded.value || zoomRange.value <= 0) return;
  isDraggingZoomThumb.value = true;
  zoomDragStartX = e.clientX;
  // zoomDragInitialLevel = zoomLevel.value; // No longer needed
  zoomDragInitialLogZoom = Math.log(zoomLevel.value);
  document.addEventListener('mousemove', onZoomThumbMouseMove);
  document.addEventListener('mouseup', onZoomThumbMouseUp, { once: true });
}

function onZoomThumbMouseMove(e: MouseEvent) {
  if (!isDraggingZoomThumb.value || !zoomTrackRef.value) return;
  const deltaX = e.clientX - zoomDragStartX;
  const scrollableTrackWidth = zoomTrackDOMWidth.value - Z_THUMB_W;
  if (scrollableTrackWidth <= 0) return;

  if (LOG_ZOOM_RANGE_EFFECTIVE.value <= 1e-9) {
    return; // No change if no effective log range
  }

  const logPositionChangeRatio = deltaX / scrollableTrackWidth;
  const newLogZoom = zoomDragInitialLogZoom + logPositionChangeRatio * LOG_ZOOM_RANGE_EFFECTIVE.value;
  const newLinearZoom = Math.exp(newLogZoom);
  
  updateZoom(
    clamp(newLinearZoom, MIN_ZOOM_LEVEL, maxZoomLevel.value),
    centerPxToMaintainForZoom.value
  );
}

function onZoomThumbMouseUp() {
  isDraggingZoomThumb.value = false;
  document.removeEventListener('mousemove', onZoomThumbMouseMove);
}

function onZoomTrackMouseDown(e: MouseEvent) {
  if (!isLoaded.value || !zoomTrackRef.value || zoomRange.value <= 0) return;
  if (e.target !== zoomTrackRef.value) return;

  if (LOG_ZOOM_RANGE_EFFECTIVE.value <= 1e-9) {
    updateZoom(MIN_ZOOM_LEVEL, centerPxToMaintainForZoom.value);
    return;
  }

  const rect = zoomTrackRef.value.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const scrollableTrackWidth = zoomTrackDOMWidth.value - Z_THUMB_W;
  
  if (scrollableTrackWidth <= 0) {
     const targetNormalizedLogPosition = (clickX < zoomTrackDOMWidth.value / 2) ? 0 : 1;
     const newLogZoom = LOG_MIN_ZOOM_LEVEL_EFFECTIVE.value + targetNormalizedLogPosition * LOG_ZOOM_RANGE_EFFECTIVE.value;
     const newLinearZoom = Math.exp(newLogZoom);
     updateZoom(
        clamp(newLinearZoom, MIN_ZOOM_LEVEL, maxZoomLevel.value),
        centerPxToMaintainForZoom.value
      );
    return;
  }

  const targetThumbStartX = clickX - Z_THUMB_W / 2;
  const targetNormalizedLogPosition = clamp(
    targetThumbStartX / scrollableTrackWidth,
    0,
    1
  );
  const newLogZoom = LOG_MIN_ZOOM_LEVEL_EFFECTIVE.value + targetNormalizedLogPosition * LOG_ZOOM_RANGE_EFFECTIVE.value;
  const newLinearZoom = Math.exp(newLogZoom);

  updateZoom(
    clamp(newLinearZoom, MIN_ZOOM_LEVEL, maxZoomLevel.value),
    centerPxToMaintainForZoom.value
  );
}

const panBarRegions = computed(() => {
  if (
    !isLoaded.value ||
    !panTrackDOMWidth.value ||
    !audioDuration.value ||
    ranges.value.length === 0 ||
    panTrackDOMWidth.value <= 0 // Ensure track width is positive
  ) {
    return [];
  }
  const trackWidth = panTrackDOMWidth.value;
  return ranges.value
    .map((r) => {
      const startPercent = r.start / audioDuration.value;
      const endPercent = r.end / audioDuration.value;

      // Clamp percentages to [0, 1] to handle ranges outside audioDuration (should not happen with valid ranges)
      const clampedStartPercent = clamp(startPercent, 0, 1);
      const clampedEndPercent = clamp(endPercent, 0, 1);

      const left = clampedStartPercent * trackWidth;
      const right = clampedEndPercent * trackWidth;
      
      return {
        id: r.id,
        leftPx: left,
        widthPx: Math.max(0, right - left), // Ensure width is not negative
        color: r.color // Uses the original hsla color string which includes alpha
      };
    })
    .filter((r) => r.widthPx >= 1); // Only show if width is at least 1px
});

const panBarSpliceMarkers = computed(() => {
  if (
    !isLoaded.value ||
    !panTrackDOMWidth.value ||
    !audioDuration.value ||
    spliceTimes.value.length === 0 ||
    panTrackDOMWidth.value <= 0
  ) {
    return [];
  }
  const trackWidth = panTrackDOMWidth.value;
  return spliceTimes.value.map((spliceTime, index) => {
    const percent = spliceTime / audioDuration.value;
    const clampedPercent = clamp(percent, 0, 1); // Should already be within [0,1] if spliceTime <= audioDuration
    const left = clampedPercent * trackWidth;
    
    return {
      id: `splice-${index}`, // Unique ID for v-for key
      leftPx: left,
    };
  });
});

function closeContextMenu() {
  isContextMenuVisible.value = false;
  contextMenuRangeId.value = null;
  document.removeEventListener('click', closeContextMenuOnClickOutside);
  document.removeEventListener('contextmenu', closeContextMenuOnClickOutside);
}

function closeContextMenuOnClickOutside(event: MouseEvent | PointerEvent) {
  // Only close if the menu is visible, the ref exists,
  // and the event target is not within the context menu.
  if (
    isContextMenuVisible.value &&
    contextMenuRef.value &&
    !contextMenuRef.value.contains(event.target as Node)
  ) {
    closeContextMenu();
  }
  // If the click/contextmenu is inside the menu, do nothing.
  // Left-clicks inside are already handled by @click.stop on the menu element.
  // This check ensures right-clicks inside also don't close the menu.
}

function onRangeContextMenu(event: MouseEvent, rangeId: number) {
  event.preventDefault();
  event.stopPropagation(); // Prevent event from bubbling to document
  if (props.readonly) return;

  // Close range tooltip if open
  if (isRangeTooltipVisible.value) closeRangeTooltip();

  // If a context menu is already visible for another range, close it first
  if (isContextMenuVisible.value && contextMenuRangeId.value !== rangeId) {
    closeContextMenu();
  }
  
  contextMenuRangeId.value = rangeId;
  contextMenuPosition.value = { x: event.pageX, y: event.pageY };
  isContextMenuVisible.value = true;

  nextTick(() => {
    document.addEventListener('click', closeContextMenuOnClickOutside, { once: true });
    document.addEventListener('contextmenu', closeContextMenuOnClickOutside, { once: true });
  });
}

function deleteRangeFromContextMenu() {
  if (contextMenuRangeId.value === null) return;
  const index = ranges.value.findIndex(r => r.id === contextMenuRangeId.value);
  if (index !== -1) {
    ranges.value.splice(index, 1);
    // The watcher on `ranges` will automatically emit 'update:selected'
  }
  closeContextMenu(); // Close menu after action
}

function handleEscapeKey(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (isContextMenuVisible.value) {
      closeContextMenu();
    }
    if (isRangeTooltipVisible.value) {
      closeRangeTooltip();
    }
  }
}

// Range Tooltip Functions
function closeRangeTooltip() {
  if (!isRangeTooltipVisible.value) return;
  isRangeTooltipVisible.value = false;
  selectedRangeForTooltip.value = null;
  document.removeEventListener('click', handleClickOutsideRangeTooltipOnCapture, true);
}

function handleClickOutsideRangeTooltipOnCapture(event: MouseEvent) {
  if (
    isRangeTooltipVisible.value &&
    rangeTooltipRef.value &&
    !rangeTooltipRef.value.contains(event.target as Node)
  ) {
    // Check if the click target is another range fill. If so, handleRangeFillClick will manage opening the new tooltip.
    const targetIsRangeFill = (event.target as HTMLElement)?.closest('.range-fill');
    if (!targetIsRangeFill) { // Only close if not clicking another range fill which would open a new tooltip.
        closeRangeTooltip();
    }
  }
}

function openRangeTooltip(range: Range, event: MouseEvent) {
  if (!props.readonly) return;

  // If clicking the same range that already has an open tooltip, toggle it (close it).
  if (isRangeTooltipVisible.value && selectedRangeForTooltip.value?.id === range.id) {
    closeRangeTooltip();
    return;
  }
  
  // Close context menu if it's open
  if (isContextMenuVisible.value) closeContextMenu();
  // Close any existing range tooltip first before opening a new one
  closeRangeTooltip();


  selectedRangeForTooltip.value = range;
  // Position tooltip slightly offset from cursor for better visibility
  // Use pageX/pageY for document-relative positioning, similar to context menu.
  rangeTooltipPosition.value = {
    x: event.pageX + 15,
    y: event.pageY + 15
  };
  isRangeTooltipVisible.value = true;

  nextTick(() => {
    document.addEventListener('click', handleClickOutsideRangeTooltipOnCapture, true);
  });
}

function handleRangeFillClick(rangeId: number, event: MouseEvent) {
  // event.stopPropagation() is handled by @click.stop in template
  const range = ranges.value.find(r => r.id === rangeId);
  if (!range) return;

  if (props.readonly) {
    openRangeTooltip(range, event);
  }
  // In non-readonly mode, clicking a range fill currently does nothing by itself
  // as the event is stopped. This prevents interference with underlying canvas click handlers.
}

watch(() => props.readonly, (isReadonly) => {
  if (!isReadonly) {
    if (isRangeTooltipVisible.value) closeRangeTooltip();
  } else {
    if (isContextMenuVisible.value) closeContextMenu();
  }
});

function resetAndCleanupAudioResources() {
  stopAudio(); // Stops current playback and disconnects audioSourceNode

  // Release internal audio graph nodes (if they exist)
  if (liveAnalyser.value) {
    liveAnalyser.value.disconnect();
    liveAnalyser.value = null;
  }
  if (gainNode.value) {
    gainNode.value.disconnect();
    gainNode.value = null;
  }

  // Close and release the internal AudioContext if it exists
  // getAudioContext() will create a new one if needed later
  if (internalAudioContext.value) {
    internalAudioContext.value.close().catch((e) => {
      console.warn('Error closing AudioContext during resource reset:', e);
    });
    internalAudioContext.value = null;
  }

  audioBuffer.value = null; // Release reference to the decoded audio buffer

  // Release canvas and large data arrays
  if (cacheCanvas.value) {
    cacheCanvas.value.width = 0; // Attempt to release graphics memory
    cacheCanvas.value.height = 0;
    cacheCanvas.value = null;
  }
  spectrogramData.value = [];
  spliceTimes.value = [];
  ranges.value = []; // Clear ranges when audio source changes

  // Reset state variables
  isLoaded.value = false;
  isLoading.value = false; // loadAndProcessAudio will set it to true again
  audioDuration.value = 0;
  currentTime.value = 0;
  offsetIndex.value = 0;
  zoomLevel.value = DEFAULT_BASE_ZOOM; // Reset zoom to default
  windowSize.value = 0; // Will be recalculated by generateSpectrogramDataOffline
  totalBins.value = 0;
  cacheHeightBins.value = 0;


  // Reset interaction states
  isPanning.value = false;
  isSpacePanningActive.value = false;
  isMiddleClickPanning.value = false;
  isDraggingProgress.value = false;
  draggingRangeId.value = null;
  isSelecting.value = false;
  selectStartXPx.value = 0;
  selectCurrentXPx.value = 0;
  
  // Reset UI states
  showHoverLine.value = false;
  isContextMenuVisible.value = false;
  contextMenuRangeId.value = null;
  isRangeTooltipVisible.value = false;
  selectedRangeForTooltip.value = null;

  // Reset playback options
  playInViewportOnly.value = false;
  playInSelectionOnly.value = false;
  loopPlayback.value = false;
  autoScroll.value = false;
}

</script>
