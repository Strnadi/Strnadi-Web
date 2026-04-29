<route lang="yaml">
meta:
  layout: desktop/side
</route>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted, watch } from 'vue';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import {
  getFilteredRecordings,
  getDialects,
  getRecording,
  updateDetectedDialect,
  type FilteredPartModel,
  type DetectedDialect,
  type DialectDefinition,
  type RecordingModel
} from '@/api/recordings';
import type { Numeric } from '@/types/basic';
import { accountStore } from '@/state/AccountStore';
import { DialectColors } from '@/views/map/RecordingsMap.vue';
import MultiColorSquare from '@/components/MultiColorSquare.vue';
import TranslatedText, { t } from '@/components/TranslatedText.vue';
import Spectrogram from '@/views/Spectrogram.vue';

interface SpectrogramRange {
  id: Numeric;
  start: number;
  end: number;
  color?: string;
  colors?: string[];
  payload?: unknown;
}

const queryClient = useQueryClient();

const { data: filteredParts, isLoading } = useQuery({
  queryKey: ['filtered-recordings'],
  queryFn: () => getFilteredRecordings()
});

const { data: dialects } = useQuery({
  queryKey: ['dialects'],
  queryFn: () => getDialects()
});

interface UnconfirmedEntry {
  filteredPart: FilteredPartModel;
  detected: DetectedDialect;
}

const unconfirmed = computed<UnconfirmedEntry[]>(() => {
  if (!filteredParts.value) return [];
  const entries: UnconfirmedEntry[] = [];
  for (const fp of filteredParts.value) {
    if (!fp.detectedDialects) continue;
    for (const dd of fp.detectedDialects) {
      if (!dd.confirmedDialectId && (dd.predictedDialectId || dd.userGuessDialectId)) {
        entries.push({ filteredPart: fp, detected: dd });
      }
    }
  }
  return entries;
});

const currentIndex = ref(0);
const currentEntry = computed(() => unconfirmed.value[currentIndex.value] ?? null);
const totalCount = computed(() => unconfirmed.value.length);
const remaining = computed(() => Math.max(0, totalCount.value - currentIndex.value));
const isFinished = computed(() => totalCount.value > 0 && currentIndex.value >= totalCount.value);

const recording = ref<RecordingModel | null>(null);
const recordingLoading = ref(false);
const recordingError = ref<string | null>(null);

async function loadCurrentRecording() {
  const entry = currentEntry.value;
  if (!entry) { recording.value = null; return; }
  recordingLoading.value = true;
  recordingError.value = null;
  try {
    recording.value = await getRecording(entry.filteredPart.recordingId, false);
  } catch {
    recordingError.value = t('admin.confirmation.confirmed_error');
    recording.value = null;
  } finally {
    recordingLoading.value = false;
  }
}

watch(currentEntry, () => loadCurrentRecording(), { immediate: true });

function parseIsoDate(value?: string | null): number | null {
  if (!value) return null;
  const hasTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value);
  const normalized = hasTimezone ? value : `${value}Z`;
  const ts = Date.parse(normalized);
  return Number.isFinite(ts) ? ts : null;
}

function convertIsoToRelative(iso: string, anchor: number): number {
  const target = parseIsoDate(iso);
  if (target === null) return 0;
  return (target - anchor) / 1000;
}

function getAudioUrls(): string[] {
  if (!recording.value?.parts?.length) return [];
  return recording.value.parts
    .map((p) => `${import.meta.env.VITE_API_URL}/recordings/part/${recording.value!.id}/${p.id}/sound`);
}

function buildSegmentRange(): SpectrogramRange[] {
  if (!currentEntry.value || !recording.value?.parts?.length) return [];
  const anchor = parseIsoDate(recording.value.parts[0].startDate);
  if (anchor === null) return [];
  const fp = currentEntry.value.filteredPart;
  return [{ id: fp.id, start: convertIsoToRelative(fp.startDate, anchor), end: convertIsoToRelative(fp.endDate, anchor), colors: computeRangeColors(fp) }];
}

const DEFAULT_SEGMENT_COLOR = '#4B5563';
function resolveDialectColor(code: string | null | undefined): string {
  if (!code || !DialectColors.value) return DEFAULT_SEGMENT_COLOR;
  return DialectColors.value[code] ?? DEFAULT_SEGMENT_COLOR;
}
function computeRangeColors(fp: FilteredPartModel): string[] {
  const detected = fp.detectedDialects ?? [];
  const codes: string[] = [];
  detected.forEach((entry) => {
    const code = entry.confirmedDialect ?? entry.predictedDialect ?? entry.userGuessDialect;
    if (code) codes.push(code);
  });
  if (!codes.length) return [DEFAULT_SEGMENT_COLOR];
  return codes.map(resolveDialectColor);
}
function getDialectColor(code: string | null | undefined): string { return resolveDialectColor(code); }

const topPrediction = computed(() => {
  const d = currentEntry.value?.detected;
  if (!d) return null;
  return d.predictedDialectId
    ? { id: d.predictedDialectId, label: d.predictedDialect ?? String(d.predictedDialectId) }
    : d.userGuessDialectId
      ? { id: d.userGuessDialectId, label: d.userGuessDialect ?? String(d.userGuessDialectId) }
      : null;
});
const userGuess = computed(() => {
  const d = currentEntry.value?.detected;
  if (!d || !d.userGuessDialectId) return null;
  return { id: d.userGuessDialectId, label: d.userGuessDialect ?? String(d.userGuessDialectId) };
});

const confirmingIds = ref<Set<number>>(new Set());
const confirmationMessage = ref<string | null>(null);
const selectedDialectId = ref<number | null>(null);

async function confirmDialect(dialectId: number | null) {
  if (!dialectId || !currentEntry.value || !accountStore.token) return;
  const entry = currentEntry.value;
  confirmingIds.value = new Set([...confirmingIds.value, entry.detected.id]);
  confirmationMessage.value = null;
  try {
    await updateDetectedDialect(accountStore.token, {
      id: entry.detected.id,
      userGuessDialectId: entry.detected.userGuessDialectId ?? null,
      predictedDialectId: entry.detected.predictedDialectId ?? null,
      confirmedDialectId: dialectId
    });
    await queryClient.invalidateQueries({ queryKey: ['filtered-recordings'] });
    advanceToNext();
  } catch {
    confirmationMessage.value = t('admin.confirmation.confirmed_error');
  } finally {
    const next = new Set(confirmingIds.value);
    next.delete(entry.detected.id);
    confirmingIds.value = next;
  }
}

function skipCurrent() { confirmationMessage.value = null; advanceToNext(); }
function advanceToNext() { confirmationMessage.value = null; resetCard(); currentIndex.value++; }
function goBack() { if (currentIndex.value > 0) { currentIndex.value--; confirmationMessage.value = null; resetCard(); } }
function restartReview() { currentIndex.value = 0; confirmationMessage.value = null; resetCard(); }

// --- swipe ---
const cardTransform = reactive({ x: 0, y: 0, rotation: 0, opacity: 1 });
const swipeTooltip = ref('');
const showSwipeTooltip = ref(false);
const isAnimating = ref(false);
const isMobile = /Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
let touchStartX = 0, touchStartY = 0, lastTouchX = 0, lastTouchY = 0, lastTouchTime = 0;
const SWIPE_THRESHOLD = 120, VELOCITY_THRESHOLD = 0.4;

function resetCard() {
  cardTransform.x = 0; cardTransform.y = 0; cardTransform.rotation = 0; cardTransform.opacity = 1;
  isAnimating.value = false; swipeTooltip.value = ''; showSwipeTooltip.value = false;
}

function updateCardPreview(dx: number, dy: number) {
  if (isAnimating.value) return;
  const dist = Math.sqrt(dx * dx + dy * dy);
  cardTransform.x = dx; cardTransform.y = dy; cardTransform.rotation = dx / 25;
  cardTransform.opacity = Math.max(0, 1 - dist / 600);
  const absX = Math.abs(dx), absY = Math.abs(dy), threshold = SWIPE_THRESHOLD;
  let text = '';
  if (absX > absY && absX > threshold) {
    if (dx > 0 && topPrediction.value) text = `✓ ${topPrediction.value.label}`;
    else if (dx < 0) text = t('admin.confirmation.all_labels');
  } else if (dy < 0 && absY > threshold && absY > absX * 1.3) {
    const label = userGuess.value?.label ?? topPrediction.value?.label;
    if (label) text = `✓ ${label}`;
  }
  swipeTooltip.value = text; showSwipeTooltip.value = !!text;
}

function animateExit(direction: 'right' | 'left' | 'up', cb: () => void) {
  if (isAnimating.value) return;
  isAnimating.value = true; showSwipeTooltip.value = false;
  const w = window.innerWidth, h = window.innerHeight;
  const tx = direction === 'right' ? w + 200 : direction === 'left' ? -w - 200 : cardTransform.x;
  const ty = direction === 'up' ? -h - 200 : cardTransform.y;
  const tr = direction === 'right' ? 15 : direction === 'left' ? -15 : -5;
  const sx = cardTransform.x, sy = cardTransform.y, sr = cardTransform.rotation, so = cardTransform.opacity;
  const dur = 300, t0 = performance.now();
  (function tick(now: number) {
    const p = Math.min((now - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
    cardTransform.x = sx + (tx - sx) * e; cardTransform.y = sy + (ty - sy) * e;
    cardTransform.rotation = sr + (tr - sr) * e; cardTransform.opacity = so + (0 - so) * e;
    if (p < 1) requestAnimationFrame(tick); else cb();
  })(t0);
}

function handleSwipe(dx: number, dy: number, vx: number, vy: number): boolean {
  if (isAnimating.value || !currentEntry.value) return false;
  const absX = Math.abs(dx), absY = Math.abs(dy), speedX = Math.abs(vx);
  const isFlickX = speedX > VELOCITY_THRESHOLD && absX > 40;
  const isFlickY = Math.abs(vy) > VELOCITY_THRESHOLD && absY > 80 && absY > absX * 1.3;
  if (absX > absY && (isFlickX || absX > SWIPE_THRESHOLD)) {
    if (dx > 0) {
      const id = topPrediction.value?.id ?? userGuess.value?.id;
      if (id) { animateExit('right', () => { if (!confirmingIds.value.has(currentEntry.value!.detected.id)) confirmDialect(id); }); return true; }
    } else { animateExit('left', () => resetCard()); return true; }
  }
  if (dy < 0 && (isFlickY || (absY > SWIPE_THRESHOLD && absY > absX * 1.3))) {
    const id = (userGuess.value && topPrediction.value && userGuess.value.id !== topPrediction.value.id) ? userGuess.value.id : topPrediction.value?.id;
    if (id) { animateExit('up', () => { if (!confirmingIds.value.has(currentEntry.value!.detected.id)) confirmDialect(id); }); return true; }
  }
  return false;
}

function onTouchStart(e: TouchEvent) { if (!isMobile || isAnimating.value) return; const c = e.changedTouches[0]; touchStartX = c.clientX; touchStartY = c.clientY; lastTouchX = c.clientX; lastTouchY = c.clientY; lastTouchTime = performance.now(); resetCard(); }
function onTouchMove(e: TouchEvent) { if (!isMobile || isAnimating.value) return; const c = e.changedTouches[0]; lastTouchX = c.clientX; lastTouchY = c.clientY; lastTouchTime = performance.now(); updateCardPreview(c.clientX - touchStartX, c.clientY - touchStartY); }
function onTouchEnd(e: TouchEvent) { if (!isMobile || isAnimating.value) return; const c = e.changedTouches[0]; const now = performance.now(); const dx = c.clientX - touchStartX, dy = c.clientY - touchStartY, dt = now - lastTouchTime; const vx = dt > 0 ? (c.clientX - lastTouchX) / dt : 0, vy = dt > 0 ? (c.clientY - lastTouchY) / dt : 0; if (!handleSwipe(dx, dy, vx, vy)) resetCard(); }

function onKeydown(e: KeyboardEvent) {
  if (isAnimating.value || !currentEntry.value) return;
  if (e.key === 'ArrowRight' || e.key === 'Enter') { const id = topPrediction.value?.id ?? userGuess.value?.id; if (id) { animateExit('right', () => confirmDialect(id)); } }
  else if (e.key === 'ArrowUp') { const id = (userGuess.value && topPrediction.value && userGuess.value.id !== topPrediction.value.id) ? userGuess.value.id : topPrediction.value?.id; if (id) animateExit('up', () => confirmDialect(id)); }
  else if (e.key === 'ArrowLeft') { resetCard(); }
  else if (e.key === 'ArrowDown' || e.key === 's') { skipCurrent(); }
  else if (e.key === 'Backspace') { goBack(); }
}
onMounted(() => document.addEventListener('keydown', onKeydown));
onUnmounted(() => document.removeEventListener('keydown', onKeydown));
</script>

<template>
  <h1><TranslatedText identifier="admin.confirmation.title" /></h1>

  <template v-if="isLoading">
    <p><TranslatedText identifier="states.loading" /></p>
  </template>

  <template v-else-if="totalCount === 0">
    <div class="flex flex-col items-center gap-4 py-12 text-center">
      <span class="text-5xl">&#127881;</span>
      <p class="text-lg font-semibold text-emerald-600"><TranslatedText identifier="admin.confirmation.all_confirmed" /></p>
    </div>
  </template>

  <template v-else-if="isFinished">
    <div class="flex flex-col items-center gap-4 py-12 text-center">
      <span class="text-5xl">&#9989;</span>
      <p class="text-lg font-semibold"><TranslatedText identifier="admin.confirmation.review_complete" /></p>
      <button class="button-primary px-6 py-2" @click="restartReview"><TranslatedText identifier="admin.confirmation.restart" /></button>
    </div>
  </template>

  <template v-else-if="currentEntry">
    <p class="text-sm text-gray-500 mb-1">
      <TranslatedText identifier="admin.confirmation.remaining" /> {{ remaining }}
      <span class="mx-1">|</span> {{ progressText }}
    </p>
    <p v-if="confirmationMessage" class="text-sm font-semibold mb-2" :class="confirmationMessage.includes('error') || confirmationMessage.includes('chyb') ? 'text-red-500' : 'text-emerald-600'">{{ confirmationMessage }}</p>

    <div
      class="relative w-full overflow-hidden"
      :class="isMobile ? 'swipe-card bg-white rounded-2xl shadow-lg border border-gray-200 touch-pan-y' : ''"
      :style="isMobile ? {
        transform: `translate(${cardTransform.x}px, ${cardTransform.y}px) rotate(${cardTransform.rotation}deg)`,
        opacity: cardTransform.opacity,
        willChange: isAnimating ? 'transform, opacity' : 'auto'
      } : undefined"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    >
      <div v-if="showSwipeTooltip && isMobile" class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-6 py-3 rounded-3xl text-xl font-bold pointer-events-none z-50 transition-opacity duration-200">
        {{ swipeTooltip }}
      </div>

      <div :class="isMobile ? 'p-4' : ''">
        <div v-if="recordingLoading" class="text-sm text-gray-400 py-8 text-center"><TranslatedText identifier="states.loading" /></div>
        <div v-else-if="recordingError" class="text-sm text-red-500 py-4 text-center">{{ recordingError }}</div>
        <template v-else-if="recording">
          <Spectrogram
            :audio-urls="getAudioUrls()"
            :selected="buildSegmentRange()"
            :height="200"
            :readonly="true"
            :simple-controls="true"
            :download-only-selections="true"
            :max-frequency="10000"
            :min-frequency="3000"
            :margin="{ top: 8, right: 4, bottom: 20, left: 28 }"
            :class="isMobile ? 'mb-3' : 'mb-4'"
          />
        </template>

        <div class="flex flex-col gap-2 mb-3">
          <div v-if="topPrediction" class="flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50">
            <MultiColorSquare size="16px" :colors="[getDialectColor(topPrediction.label)]" dot="true" questionmark="false" />
            <span class="text-sm font-semibold"><TranslatedText identifier="admin.confirmation.model_prediction" /></span>
            <span class="text-sm ml-auto font-bold">{{ topPrediction.label }}</span>
          </div>
          <div v-if="userGuess && userGuess.id !== topPrediction?.id" class="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50">
            <MultiColorSquare size="16px" :colors="[getDialectColor(userGuess.label)]" dot="false" questionmark="true" />
            <span class="text-sm font-semibold"><TranslatedText identifier="admin.confirmation.user_guess" /></span>
            <span class="text-sm ml-auto font-bold">{{ userGuess.label }}</span>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex flex-wrap gap-2">
            <button
              v-if="topPrediction"
              class="button-primary px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="confirmingIds.has(currentEntry.detected.id) || recordingLoading"
              @click="confirmDialect(topPrediction.id)"
            >
              {{ t('admin.confirmation.confirm_model') }} ({{ topPrediction.label }})
              <span class="text-xs opacity-70 ml-1">↵</span>
            </button>
            <button
              v-if="userGuess && userGuess.id !== topPrediction?.id"
              class="px-4 py-2 text-sm border-2 rounded-2xl border-amber-300 bg-amber-50 font-semibold text-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="confirmingIds.has(currentEntry.detected.id) || recordingLoading"
              @click="confirmDialect(userGuess.id)"
            >
              {{ t('admin.confirmation.confirm_user') }} ({{ userGuess.label }})
              <span class="text-xs opacity-70 ml-1">↑</span>
            </button>
          </div>

          <div class="flex items-center gap-2">
            <select
              v-model="selectedDialectId"
              class="text-sm border border-gray-300 rounded-lg px-3 py-2 flex-1"
              :disabled="confirmingIds.has(currentEntry.detected.id) || recordingLoading"
            >
              <option :value="null">{{ t('admin.confirmation.select_dialect') }}</option>
              <option v-for="d in dialects" :key="d.id" :value="d.id">{{ d.dialectCode }}</option>
            </select>
            <button
              class="button-secondary px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!selectedDialectId || confirmingIds.has(currentEntry.detected.id) || recordingLoading"
              @click="selectedDialectId && confirmDialect(selectedDialectId)"
            >
              <TranslatedText identifier="admin.confirmation.confirm" />
            </button>
          </div>

          <div class="flex gap-2">
            <button class="button-secondary px-4 py-2 text-sm flex-1" :disabled="recordingLoading" @click="skipCurrent">
              <TranslatedText identifier="admin.confirmation.skip" />
              <span class="text-xs opacity-70 ml-1">↓</span>
            </button>
            <button class="button-secondary px-4 py-2 text-sm flex-1 disabled:opacity-50 disabled:cursor-not-allowed" :disabled="currentIndex === 0 || recordingLoading" @click="goBack">
              <TranslatedText identifier="admin.confirmation.back" />
              <span class="text-xs opacity-70 ml-1">⌫</span>
            </button>
          </div>

          <RouterLink
            :to="`/mapa/nahravka/${currentEntry.filteredPart.recordingId}/upravit-dialekt`"
            class="text-xs text-blue-500 hover:underline text-center"
          >
            <TranslatedText identifier="admin.confirmation.open_editor" />
          </RouterLink>
        </div>
      </div>
    </div>

    <p v-if="isMobile" class="text-xs text-gray-400 mt-3 text-center">
      <TranslatedText identifier="admin.confirmation.swipe_hints" />
    </p>
    <p v-else class="text-xs text-gray-400 mt-3 text-center">
      <TranslatedText identifier="admin.confirmation.keyboard_hints" />
    </p>
  </template>
</template>

<style scoped>
.swipe-card {
  user-select: none;
  -webkit-user-select: none;
}
</style>