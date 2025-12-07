<route lang="yaml">
meta:
  layout: desktop/center
</route>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import Spectrogram from '@/views/Spectrogram.vue';
import { useRouteParams } from '@vueuse/router';
import { useFetched } from '@/utils/network';
import {
  deleteDetectedDialect,
  deleteFilteredPart,
  getDialects,
  getFilteredRecording,
  getRecording,
  patchFilteredPart,
  postDetectedDialect,
  postFilteredPart,
  type DetectedDialect,
  type DialectDefinition,
  type FilteredPartModel,
  updateDetectedDialect
} from '@/api/recordings';
import { type Numeric } from '@/types/basic';
import TranslatedText from '@/components/TranslatedText.vue';
import { DialectColors } from '@/views/map/RecordingsMap.vue';
import { accountStore } from '@/state/AccountStore';

interface SpectrogramRange {
  id: number;
  start: number;
  end: number;
  color?: string;
  colors?: string[];
  payload?: SegmentMeta;
}

interface SegmentMeta {
  key: number;
  filteredPart?: FilteredPartModel;
  dialectCode: string | null;
  representant: boolean;
  state: number;
  isNew: boolean;
  dirty: boolean;
  markedForDeletion: boolean;
  start: number;
  end: number;
  originalStart: number;
  originalEnd: number;
}

interface DialectSelection {
  userGuessDialectId: number | null;
  predictedDialectId: number | null;
  confirmedDialectId: number | null;
}

interface FilteredPartPatchPayload {
  recordingId: number;
  parentId: number | null;
  startDate: string;
  endDate: string;
  state: number;
  representantFlag?: boolean;
}

interface FilteredPartCreatePayload {
  recordingId: number;
  startDate: string;
  endDate: string;
  dialectCode: string;
}

const env = import.meta.env;
const id = useRouteParams<Numeric>('id');

const {
  data: recording,
  isLoading,
  error
} = useFetched(getRecording, id, false);

const { data: filteredParts, refetch: refetchFilteredParts } = useFetched(
  getFilteredRecording,
  id
);

const { data: dialectDefinitions } = useFetched(getDialects);

const currentTime = ref(0);
const segments = ref<SpectrogramRange[] | null>(null);
const segmentMetas = reactive<Record<number, SegmentMeta>>({});
const detectionForms = ref<Record<number, DialectSelection>>({});
const newDetectionForms = reactive<Record<number, DialectSelection>>({});
const detectionSaving = reactive<Record<number, boolean>>({});
const detectionCreateSaving = reactive<Record<number, boolean>>({});
const detectionMessage = ref<string | null>(null);
const detectionError = ref<string | null>(null);
const segmentError = ref<string | null>(null);
const segmentSuccess = ref<string | null>(null);
const selectedDialectCode = ref<string | null>(null);
const isSavingSegments = ref(false);
const isHydratingSegments = ref(false);
const tooltipConfirmedDialectId = ref<number | null>(null);
const tooltipSaving = ref(false);
const currentContextMenuRangeId = ref<Numeric | number | null>(null);
const tooltipCreateDialectId = ref<number | null>(null);
const tooltipCreateSaving = ref(false);
const tooltipAddDetectionDialectId = ref<number | null>(null);
const tooltipAddDetectionSaving = ref(false);

const DEFAULT_SEGMENT_COLOR = '#4B5563';

const availableDialects = computed<DialectDefinition[]>(
  () => dialectDefinitions.value ?? []
);

const isAdmin = computed(() => accountStore.user?.role === 'admin');
const canEditDialects = computed(() => isAdmin.value);

function parseIsoDate(value?: string | null) {
  if (!value) return null;
  const hasTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value);
  const normalized = hasTimezone ? value : `${value}Z`;
  const ts = Date.parse(normalized);
  return Number.isFinite(ts) ? ts : null;
}

const anchorTimestamp = computed(() => {
  const recordingStart = recording.value?.parts?.[0]?.startDate;
  const filteredStart = filteredParts.value?.[0]?.startDate;
  return parseIsoDate(recordingStart ?? filteredStart);
});

function selectionColorResolver() {
  return resolveDialectColor(selectedDialectCode.value);
}

watch(
  availableDialects,
  (list) => {
    if (!list.length) return;
    if (!selectedDialectCode.value) {
      selectedDialectCode.value = list[0]?.dialectCode ?? null;
      return;
    }
    if (!list.some((d) => d.dialectCode === selectedDialectCode.value)) {
      selectedDialectCode.value = list[0]?.dialectCode ?? null;
    }
  },
  { immediate: true }
);

watch(
  [filteredParts, anchorTimestamp, () => DialectColors.value],
  ([parts]) => {
    hydrateSegments(parts ?? []);
  },
  { immediate: true }
);

watch(
  filteredParts,
  (parts) => {
    hydrateDetectionForms(parts ?? []);
  },
  { immediate: true }
);

watch(segments, (newRanges, oldRanges) => {
  if (isHydratingSegments.value) return;
  syncSegmentRanges(newRanges ?? [], oldRanges ?? []);
});

watch(currentContextMenuRangeId, (rangeId) => {
  if (rangeId != null) {
    tooltipConfirmedDialectId.value = getDefaultDialectIdForRange(rangeId);
    tooltipCreateDialectId.value = null;
    tooltipAddDetectionDialectId.value = null;
  }
});

const activeSegmentMetas = computed(() =>
  Object.values(segmentMetas).filter((meta) => !meta.markedForDeletion)
);

const deletedSegmentMetas = computed(() =>
  Object.values(segmentMetas).filter(
    (meta) => meta.markedForDeletion && !meta.isNew
  )
);

const pendingSegmentChanges = computed(() => {
  // Only check if we're not currently hydrating to avoid false positives
  if (isHydratingSegments.value) return false;
  return Object.values(segmentMetas).some(
    (meta) =>
      meta.isNew || meta.dirty || (meta.markedForDeletion && !meta.isNew)
  );
});

function resolveDialectColor(code?: string | null) {
  if (!code) return DEFAULT_SEGMENT_COLOR;
  const colors = DialectColors.value;
  if (!colors) return DEFAULT_SEGMENT_COLOR;
  return colors[code as keyof typeof colors] ?? DEFAULT_SEGMENT_COLOR;
}

function representantFlag(part: FilteredPartModel) {
  return part.representantFlag ?? false;
}

function inferDialectCode(part: FilteredPartModel) {
  const detected = part.detectedDialects ?? [];
  for (const entry of detected) {
    if (entry.confirmedDialect) return entry.confirmedDialect;
  }
  for (const entry of detected) {
    if (entry.predictedDialect) return entry.predictedDialect;
  }
  for (const entry of detected) {
    if (entry.userGuessDialect) return entry.userGuessDialect;
  }
  return null;
}

function convertIsoToRelative(iso: string) {
  const anchor = anchorTimestamp.value;
  const target = parseIsoDate(iso);
  if (anchor === null || target === null) return 0;
  return (target - anchor) / 1000;
}

function convertRelativeToIso(seconds: number) {
  const anchor = anchorTimestamp.value;
  if (anchor === null || !Number.isFinite(seconds)) return null;
  return new Date(anchor + seconds * 1000).toISOString();
}

function formatRelativeTime(seconds: number) {
  if (!Number.isFinite(seconds)) return '--:--';
  const sign = seconds < 0 ? '-' : '';
  const abs = Math.abs(seconds);
  const minutes = Math.floor(abs / 60);
  const secs = Math.floor(abs % 60)
    .toString()
    .padStart(2, '0');
  return `${sign}${minutes}:${secs}`;
}

function formatAbsoluteFromSeconds(seconds: number) {
  const anchor = anchorTimestamp.value;
  if (anchor === null || !Number.isFinite(seconds)) return '--:--';
  const date = new Date(anchor + seconds * 1000);
  if (isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function hydrateSegments(parts: FilteredPartModel[]) {
  isHydratingSegments.value = true;
  segments.value = [];
  for (const key of Object.keys(segmentMetas)) {
    delete segmentMetas[Number(key)];
  }
  parts.forEach((part) => {
    const start = convertIsoToRelative(part.startDate);
    const end = convertIsoToRelative(part.endDate);
    const meta: SegmentMeta = {
      key: part.id,
      filteredPart: part,
      dialectCode: inferDialectCode(part),
      representant: representantFlag(part),
      state: part.state,
      isNew: false,
      dirty: false,
      markedForDeletion: false,
      start,
      end,
      originalStart: start,
      originalEnd: end
    };
    segmentMetas[meta.key] = meta;
  });
  segments.value = Object.values(segmentMetas).map((meta) =>
    createRangeFromMeta(meta)
  );
  isHydratingSegments.value = false;
}

function hydrateDetectionForms(parts: FilteredPartModel[]) {
  const nextForms: Record<number, DialectSelection> = {};
  const partIds = new Set<number>();
  parts.forEach((part) => {
    partIds.add(part.id);
    part.detectedDialects?.forEach((det) => {
      nextForms[det.id] = {
        userGuessDialectId: det.userGuessDialectId ?? null,
        predictedDialectId: det.predictedDialectId ?? null,
        confirmedDialectId: det.confirmedDialectId ?? null
      };
    });
    if (!newDetectionForms[part.id]) {
      newDetectionForms[part.id] = {
        userGuessDialectId: null,
        predictedDialectId: null,
        confirmedDialectId: null
      };
    }
  });
  detectionForms.value = nextForms;
  for (const key of Object.keys(newDetectionForms)) {
    const numeric = Number(key);
    if (!partIds.has(numeric)) {
      delete newDetectionForms[numeric];
    }
  }
}

function computeRangeColors(meta: SegmentMeta) {
  const detected = meta.filteredPart?.detectedDialects ?? [];
  const codes: string[] = [];
  detected.forEach((entry) => {
    const code =
      entry.confirmedDialect ??
      entry.predictedDialect ??
      entry.userGuessDialect;
    if (code) codes.push(code);
  });
  if (!codes.length && meta.dialectCode) {
    codes.push(meta.dialectCode);
  }
  if (!codes.length) {
    return [DEFAULT_SEGMENT_COLOR];
  }
  return codes.map((code) => resolveDialectColor(code));
}

function createRangeFromMeta(meta: SegmentMeta): SpectrogramRange {
  return {
    id: meta.key,
    start: meta.start,
    end: meta.end,
    colors: computeRangeColors(meta),
    payload: meta
  };
}

function syncSegmentRanges(
  newRanges: SpectrogramRange[],
  oldRanges: SpectrogramRange[]
) {
  const newIds = new Set(newRanges.map((r) => r.id));
  newRanges.forEach((range) => {
    applyRangeMeta(range);
  });
  oldRanges.forEach((range) => {
    if (!newIds.has(range.id)) {
      handleRangeRemoved(range);
    }
  });
}

function createMetaForNewRange(range: SpectrogramRange): SegmentMeta {
  const fallback =
    selectedDialectCode.value ??
    availableDialects.value[0]?.dialectCode ??
    null;
  return {
    key: range.id,
    filteredPart: undefined,
    dialectCode: fallback,
    representant: false,
    state: 0,
    isNew: true,
    dirty: true,
    markedForDeletion: false,
    start: range.start,
    end: range.end,
    originalStart: range.start,
    originalEnd: range.end
  };
}

function applyRangeMeta(range: SpectrogramRange) {
  let meta = segmentMetas[range.id];
  if (!meta) {
    meta = createMetaForNewRange(range);
    segmentMetas[range.id] = meta;
  }
  const positionChanged =
    !isApproximatelyEqual(range.start, meta.start) ||
    !isApproximatelyEqual(range.end, meta.end);
  meta.start = range.start;
  meta.end = range.end;
  if (!meta.isNew && positionChanged) {
    meta.dirty =
      meta.dirty ||
      !isApproximatelyEqual(range.start, meta.originalStart) ||
      !isApproximatelyEqual(range.end, meta.originalEnd);
  }
  range.payload = meta;
  range.colors = computeRangeColors(meta);
}

function handleRangeRemoved(range: SpectrogramRange) {
  const meta = segmentMetas[range.id];
  if (!meta) return;
  if (meta.isNew || !meta.filteredPart) {
    delete segmentMetas[range.id];
  } else {
    meta.markedForDeletion = true;
  }
}

function isApproximatelyEqual(a: number, b: number) {
  return Math.abs(a - b) < 0.01;
}

function toggleRepresentant(meta: SegmentMeta, value: boolean) {
  meta.representant = value;
  meta.dirty = true;
}

function removeSegment(meta: SegmentMeta) {
  if (meta.isNew || !meta.filteredPart) {
    if (segments.value) {
      segments.value = segments.value.filter((range) => range.id !== meta.key);
    }
    delete segmentMetas[meta.key];
    return;
  }
  meta.markedForDeletion = true;
  if (segments.value) {
    segments.value = segments.value.filter((range) => range.id !== meta.key);
  }
}

function restoreSegment(meta: SegmentMeta) {
  if (meta.isNew || !meta.markedForDeletion) return;
  meta.markedForDeletion = false;
  if (
    segments.value &&
    !segments.value.some((range) => range.id === meta.key)
  ) {
    segments.value = [...segments.value, createRangeFromMeta(meta)];
  }
}

function resetSegments() {
  hydrateSegments(filteredParts.value ?? []);
  segmentError.value = null;
  segmentSuccess.value = null;
}

const saveSegmentChanges = async () => {
  if (!recording.value) {
    segmentError.value = 'Chybí metadata nahrávky.';
    return;
  }
  if (anchorTimestamp.value === null) {
    segmentError.value = 'Není k dispozici časový základ pro nahrávku.';
    return;
  }
  const token = accountStore.token!;
  const metas = Object.values(segmentMetas);
  const creations = metas.filter((meta) => meta.isNew);
  const updates = metas.filter(
    (meta) => !meta.isNew && meta.dirty && !meta.markedForDeletion
  );
  const deletions = metas.filter(
    (meta) => meta.markedForDeletion && !meta.isNew && meta.filteredPart
  );

  if (!creations.length && !updates.length && !deletions.length) {
    segmentSuccess.value = 'Žádné změny k uložení.';
    segmentError.value = null;
    return;
  }

  segmentError.value = null;
  segmentSuccess.value = null;
  isSavingSegments.value = true;

  try {
    for (const meta of deletions) {
      await deleteFilteredPart(token, meta.filteredPart!.id);
    }
    for (const meta of updates) {
      const startDate = convertRelativeToIso(meta.start);
      const endDate = convertRelativeToIso(meta.end);
      if (!startDate || !endDate) {
        throw new Error('Nepodařilo se převést čas úseku.');
      }
      const parentId = meta.filteredPart?.parentId;
      // if (parentId == null) {
      //   throw new Error('Chybí parentId úseku.');
      // }
      const payload: FilteredPartPatchPayload = {
        recordingId: recording.value.id,
        parentId,
        startDate,
        endDate,
        state: meta.state,
        representantFlag: meta.representant
      };
      await patchFilteredPart(token, meta.filteredPart!.id, payload);
    }
    for (const meta of creations) {
      if (!meta.dialectCode) {
        throw new Error('Nový úsek musí mít zvolený dialekt.');
      }
      const startDate = convertRelativeToIso(meta.start);
      const endDate = convertRelativeToIso(meta.end);
      if (!startDate || !endDate) {
        throw new Error('Nepodařilo se převést čas úseku.');
      }
      const payload: FilteredPartCreatePayload = {
        recordingId: recording.value.id,
        startDate,
        endDate,
        dialectCode: meta.dialectCode
      };
      await postFilteredPart(token, payload);
    }
    await refetchFilteredParts();
    segmentSuccess.value = 'Změny úseků byly uloženy.';
  } catch (err) {
    segmentError.value =
      err instanceof Error ? err.message : 'Nepodařilo se uložit změny úseků.';
  } finally {
    isSavingSegments.value = false;
  }
};

const ensureDetectionForm = (detected: DetectedDialect): DialectSelection => {
  if (!detectionForms.value[detected.id]) {
    detectionForms.value[detected.id] = {
      userGuessDialectId: detected.userGuessDialectId ?? null,
      predictedDialectId: detected.predictedDialectId ?? null,
      confirmedDialectId: detected.confirmedDialectId ?? null
    };
  }
  return detectionForms.value[detected.id]!;
};

const saveDetection = async (detected: DetectedDialect) => {
  const form = ensureDetectionForm(detected);
  detectionSaving[detected.id] = true;
  detectionError.value = null;
  detectionMessage.value = null;
  try {
    await updateDetectedDialect(accountStore.token!, {
      id: detected.id,
      userGuessDialectId: form.userGuessDialectId,
      predictedDialectId: form.predictedDialectId,
      confirmedDialectId: form.confirmedDialectId
    });
    detectionMessage.value = 'Záznam dialektu byl uložen.';
    await refetchFilteredParts();
  } catch (err) {
    detectionError.value =
      err instanceof Error
        ? err.message
        : 'Nepodařilo se uložit záznam dialektu.';
  } finally {
    detectionSaving[detected.id] = false;
  }
};

const deleteDetection = async (detected: DetectedDialect) => {
  detectionSaving[detected.id] = true;
  detectionError.value = null;
  detectionMessage.value = null;
  try {
    await deleteDetectedDialect(accountStore.token!, detected.id);
    detectionMessage.value = 'Záznam dialektu byl odstraněn.';
    await refetchFilteredParts();
  } catch (err) {
    detectionError.value =
      err instanceof Error
        ? err.message
        : 'Nepodařilo se odstranit záznam dialektu.';
  } finally {
    detectionSaving[detected.id] = false;
  }
};

const createDetection = async (meta: SegmentMeta) => {
  if (!meta.filteredPart) {
    detectionError.value = 'Nejprve uložte úsek.';
    return;
  }
  const form =
    newDetectionForms[meta.key] ??
    (newDetectionForms[meta.key] = {
      userGuessDialectId: null,
      predictedDialectId: null,
      confirmedDialectId: null
    });
  const hasValue =
    form.userGuessDialectId ??
    form.predictedDialectId ??
    form.confirmedDialectId;
  if (!hasValue) {
    detectionError.value = 'Vyberte alespoň jednu hodnotu dialektu.';
    return;
  }
  detectionCreateSaving[meta.key] = true;
  detectionError.value = null;
  detectionMessage.value = null;
  try {
    await postDetectedDialect(accountStore.token!, {
      filteredPartId: meta.filteredPart.id,
      userGuessDialectId: form.userGuessDialectId,
      predictedDialectId: form.predictedDialectId,
      confirmedDialectId: form.confirmedDialectId
    });
    newDetectionForms[meta.key] = {
      userGuessDialectId: null,
      predictedDialectId: null,
      confirmedDialectId: null
    };
    detectionMessage.value = 'Záznam dialektu byl přidán.';
    await refetchFilteredParts();
  } catch (err) {
    detectionError.value =
      err instanceof Error
        ? err.message
        : 'Nepodařilo se přidat záznam dialektu.';
  } finally {
    detectionCreateSaving[meta.key] = false;
  }
};

const findRangeById = (
  rangeId: Numeric | number | null
): SpectrogramRange | null => {
  if (!rangeId || !segments.value) return null;
  const numId = typeof rangeId === 'string' ? Number(rangeId) : rangeId;
  return segments.value.find((r) => r.id === numId) ?? null;
};

const getDefaultDialectIdForRange = (
  rangeId: Numeric | number | null
): number | null => {
  const range = findRangeById(rangeId);
  if (!range?.payload?.filteredPart) return null;

  const detectedDialects = range.payload.filteredPart.detectedDialects ?? [];

  // First, try to find predicted dialect ID
  for (const detected of detectedDialects) {
    if (detected.predictedDialectId != null) {
      return detected.predictedDialectId;
    }
  }

  // If no predicted, try user guess
  for (const detected of detectedDialects) {
    if (detected.userGuessDialectId != null) {
      return detected.userGuessDialectId;
    }
  }

  return null;
};

const getDetectedDialectsForRange = (
  rangeId: Numeric | number | null
): DetectedDialect[] => {
  const range = findRangeById(rangeId);
  return range?.payload?.filteredPart?.detectedDialects ?? [];
};

const getConfirmedDialectsForRange = (
  rangeId: Numeric | number | null
): DetectedDialect[] =>
  getDetectedDialectsForRange(rangeId).filter(
    (detected) => detected.confirmedDialectId != null
  );

const getUnconfirmedConfirmableDetectionsForRange = (
  rangeId: Numeric | number | null
): DetectedDialect[] =>
  getDetectedDialectsForRange(rangeId).filter(
    (detected) =>
      detected.confirmedDialectId == null &&
      (detected.predictedDialectId != null ||
        detected.userGuessDialectId != null)
  );

const confirmExistingDetection = async (
  detected: DetectedDialect,
  dialectId: number | null,
  close?: () => void
) => {
  if (!dialectId) {
    detectionError.value = 'Vyberte dialekt k potvrzení.';
    return;
  }
  const form = ensureDetectionForm(detected);
  detectionSaving[detected.id] = true;
  detectionError.value = null;
  detectionMessage.value = null;
  try {
    await updateDetectedDialect(accountStore.token!, {
      id: detected.id,
      userGuessDialectId: form.userGuessDialectId,
      predictedDialectId: form.predictedDialectId,
      confirmedDialectId: dialectId
    });
    detectionMessage.value = 'Dialekt byl potvrzen.';
    if (close) close();
    await refetchFilteredParts();
  } catch (err) {
    detectionError.value =
      err instanceof Error ? err.message : 'Nepodařilo se potvrdit dialekt.';
  } finally {
    detectionSaving[detected.id] = false;
  }
};

const clearConfirmedDialect = async (
  detected: DetectedDialect,
  close?: () => void
) => {
  const form = ensureDetectionForm(detected);
  detectionSaving[detected.id] = true;
  detectionError.value = null;
  detectionMessage.value = null;
  try {
    await updateDetectedDialect(accountStore.token!, {
      id: detected.id,
      userGuessDialectId: form.userGuessDialectId,
      predictedDialectId: form.predictedDialectId,
      confirmedDialectId: null
    });
    detectionMessage.value = 'Potvrzený dialekt byl odebrán.';
    if (close) close();
    await refetchFilteredParts();
  } catch (err) {
    detectionError.value =
      err instanceof Error
        ? err.message
        : 'Nepodařilo se odebrat potvrzení dialektu.';
  } finally {
    detectionSaving[detected.id] = false;
  }
};

const quickConfirmDialect = async (
  meta: SegmentMeta,
  dialectId: number | null,
  close: () => void
) => {
  if (!meta.filteredPart) {
    detectionError.value = 'Nejprve uložte úsek.';
    return;
  }
  if (!dialectId) {
    detectionError.value = 'Vyberte dialekt k potvrzení.';
    return;
  }

  tooltipSaving.value = true;
  detectionError.value = null;
  detectionMessage.value = null;

  try {
    // Check if there's an existing detected dialect for this part
    const existingDetected = meta.filteredPart.detectedDialects?.find(
      (det) => det.id
    );

    if (existingDetected) {
      // Update existing detection
      const form = ensureDetectionForm(existingDetected);
      await updateDetectedDialect(accountStore.token!, {
        id: existingDetected.id,
        userGuessDialectId: form.userGuessDialectId,
        predictedDialectId: form.predictedDialectId,
        confirmedDialectId: dialectId
      });
    } else {
      // Create new detection with confirmed dialect
      await postDetectedDialect(accountStore.token!, {
        filteredPartId: meta.filteredPart.id,
        userGuessDialectId: null,
        predictedDialectId: null,
        confirmedDialectId: dialectId
      });
    }

    detectionMessage.value = 'Dialekt byl potvrzen.';
    tooltipConfirmedDialectId.value = null;
    currentContextMenuRangeId.value = null;
    await refetchFilteredParts();
    close();
  } catch (err) {
    detectionError.value =
      err instanceof Error ? err.message : 'Nepodařilo se potvrdit dialekt.';
  } finally {
    tooltipSaving.value = false;
  }
};

const quickCreateFilteredPart = async (
  range: SpectrogramRange,
  dialectId: number | null,
  close: () => void
) => {
  if (!recording.value) {
    segmentError.value = 'Chybí metadata nahrávky.';
    return;
  }
  if (!dialectId) {
    segmentError.value = 'Vyberte dialekt.';
    return;
  }
  const anchor = anchorTimestamp.value;
  if (anchor === null) {
    segmentError.value = 'Není k dispozici časový základ pro nahrávku.';
    return;
  }

  const meta = segmentMetas[range.id];
  if (meta?.filteredPart) {
    segmentError.value = 'Úsek již existuje.';
    return;
  }

  tooltipCreateSaving.value = true;
  segmentError.value = null;
  segmentSuccess.value = null;

  try {
    const startDate = convertRelativeToIso(range.start);
    const endDate = convertRelativeToIso(range.end);
    if (!startDate || !endDate) {
      throw new Error('Nepodařilo se převést čas úseku.');
    }

    const dialect = availableDialects.value.find((d) => d.id === dialectId);
    if (!dialect) {
      throw new Error('Dialekt nenalezen.');
    }

    await postFilteredPart(accountStore.token!, {
      recordingId: recording.value.id,
      startDate,
      endDate,
      dialectCode: dialect.dialectCode
    });

    segmentSuccess.value = 'Úsek byl vytvořen.';
    tooltipCreateDialectId.value = null;
    currentContextMenuRangeId.value = null;
    await refetchFilteredParts();
    close();
  } catch (err) {
    segmentError.value =
      err instanceof Error ? err.message : 'Nepodařilo se vytvořit úsek.';
  } finally {
    tooltipCreateSaving.value = false;
  }
};

const quickAddDetectedDialect = async (
  meta: SegmentMeta,
  dialectId: number | null,
  close: () => void
) => {
  if (!meta.filteredPart) {
    detectionError.value = 'Nejprve uložte úsek.';
    return;
  }
  if (!dialectId) {
    detectionError.value = 'Vyberte dialekt.';
    return;
  }

  tooltipAddDetectionSaving.value = true;
  detectionError.value = null;
  detectionMessage.value = null;

  try {
    const isAdmin = accountStore.user?.role === 'admin';
    await postDetectedDialect(accountStore.token!, {
      filteredPartId: meta.filteredPart.id,
      userGuessDialectId: isAdmin ? null : dialectId,
      predictedDialectId: null,
      confirmedDialectId: isAdmin ? dialectId : null
    });

    detectionMessage.value = 'Záznam dialektu byl přidán.';
    tooltipAddDetectionDialectId.value = null;
    currentContextMenuRangeId.value = null;
    await refetchFilteredParts();
    close();
  } catch (err) {
    detectionError.value =
      err instanceof Error
        ? err.message
        : 'Nepodařilo se přidat záznam dialektu.';
  } finally {
    tooltipAddDetectionSaving.value = false;
  }
};
</script>

<template>
  <h1>
    <TranslatedText identifier="recordings.detail.edit_dialects_title" />
  </h1>

  <template v-if="isLoading">
    <span>
      <TranslatedText identifier="loading" />
    </span>
  </template>

  <template v-if="error">
    <span>{{ error.message }}</span>
  </template>

  <template v-else>
    <div
      v-if="!isAdmin"
      class="text-sm text-gray-600"
    >
      Tato stránka je dostupná pouze administrátorům.
    </div>
    <div
      v-else
      class="flex flex-col gap-y-6"
    >
      <Spectrogram
        v-if="
          recording &&
          recording.parts &&
          segments &&
          availableDialects.length > 0
        "
        v-model:selected="segments"
        v-model:current-time="currentTime"
        :audio-urls="
          recording.parts.map(
            (p) =>
              `${env.VITE_API_URL}/recordings/part/${recording?.id}/${p.id}/sound`
          )
        "
        :height="400"
        :max-frequency="10000"
        :min-frequency="3000"
        :selection-color-resolver="selectionColorResolver"
        :readonly="!canEditDialects"
      >
        <template #context-menu="{ range: rangeId, close }">
          <div
            v-if="
              findRangeById(rangeId) &&
              (currentContextMenuRangeId = rangeId) !== null
            "
            class="min-w-[200px] space-y-2 p-2"
          >
            <div class="text-xs text-gray-600">
              <div>
                {{
                  (() => {
                    const r = findRangeById(rangeId);
                    if (
                      !r ||
                      typeof r.start !== 'number' ||
                      typeof r.end !== 'number'
                    ) {
                      return '--:-- – --:--';
                    }
                    return `${formatRelativeTime(r.start)} – ${formatRelativeTime(r.end)}`;
                  })()
                }}
              </div>
              <div class="text-gray-500 mt-1">
                {{
                  (() => {
                    const r = findRangeById(rangeId);
                    if (
                      !r ||
                      typeof r.start !== 'number' ||
                      typeof r.end !== 'number'
                    ) {
                      return '--:-- → --:--';
                    }
                    return `${formatAbsoluteFromSeconds(r.start)} → ${formatAbsoluteFromSeconds(r.end)}`;
                  })()
                }}
              </div>
            </div>

            <!-- Create filtered part if it doesn't exist -->
            <div
              v-if="
                !findRangeById(rangeId)?.payload?.filteredPart &&
                canEditDialects
              "
              class="space-y-2 pt-2 border-t border-gray-200"
            >
              <div class="text-xs font-semibold text-gray-700">
                Vytvořit úsek s dialektem
              </div>
              <select
                v-model="tooltipCreateDialectId"
                class="w-full text-xs border border-gray-300 rounded px-2 py-1"
                :disabled="tooltipCreateSaving"
              >
                <option :value="null">Vyberte dialekt</option>
                <option
                  v-for="dialect in availableDialects"
                  :key="dialect.id"
                  :value="dialect.id"
                >
                  {{ dialect.dialectCode }}
                </option>
              </select>
              <button
                class="w-full button-primary px-2 py-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="
                  !tooltipCreateDialectId ||
                  tooltipCreateSaving ||
                  !findRangeById(rangeId)
                "
                @click="
                  (() => {
                    const r = findRangeById(rangeId);
                    if (r) {
                      quickCreateFilteredPart(r, tooltipCreateDialectId, close);
                    }
                  })()
                "
              >
                <span v-if="tooltipCreateSaving">Vytváření...</span>
                <span v-else>Vytvořit úsek</span>
              </button>
            </div>

            <!-- Add detected dialect to existing filtered part -->
            <div
              v-if="
                findRangeById(rangeId)?.payload?.filteredPart && canEditDialects
              "
              class="space-y-2 pt-2 border-t border-gray-200"
            >
              <div class="text-xs font-semibold text-gray-700">
                Přidat záznam dialektu
              </div>
              <select
                v-model="tooltipAddDetectionDialectId"
                class="w-full text-xs border border-gray-300 rounded px-2 py-1"
                :disabled="tooltipAddDetectionSaving"
              >
                <option :value="null">Vyberte dialekt</option>
                <option
                  v-for="dialect in availableDialects"
                  :key="dialect.id"
                  :value="dialect.id"
                >
                  {{ dialect.dialectCode }}
                </option>
              </select>
              <button
                class="w-full button-primary px-2 py-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="
                  !tooltipAddDetectionDialectId ||
                  tooltipAddDetectionSaving ||
                  !findRangeById(rangeId)?.payload
                "
                @click="
                  (() => {
                    const r = findRangeById(rangeId);
                    if (r?.payload) {
                      quickAddDetectedDialect(
                        r.payload,
                        tooltipAddDetectionDialectId,
                        close
                      );
                    }
                  })()
                "
              >
                <span v-if="tooltipAddDetectionSaving">Přidávání...</span>
                <span v-else>Přidat záznam</span>
              </button>
            </div>

            <!-- Admin: Confirm dialect / manage confirmed dialects -->
            <template
              v-if="
                accountStore.user?.role === 'admin' &&
                findRangeById(rangeId)?.payload?.filteredPart
              "
            >
              <div
                v-if="getConfirmedDialectsForRange(rangeId).length"
                class="space-y-2 pt-2 border-t border-gray-200"
              >
                <div class="text-xs font-semibold text-gray-700">
                  Potvrzené dialekty
                </div>
                <div
                  v-for="detected in getConfirmedDialectsForRange(rangeId)"
                  :key="`confirmed-${detected.id}`"
                  class="border border-gray-200 rounded px-2 py-2 space-y-2 bg-gray-50"
                >
                  <div class="text-[11px] text-gray-500">
                    ID #{{ detected.id }}
                  </div>
                  <select
                    v-model="detectionForms[detected.id]!.confirmedDialectId"
                    class="w-full text-xs border border-gray-300 rounded px-2 py-1"
                    :disabled="detectionSaving[detected.id]"
                  >
                    <option :value="null">Vyberte dialekt</option>
                    <option
                      v-for="dialect in availableDialects"
                      :key="dialect.id"
                      :value="dialect.id"
                    >
                      {{ dialect.dialectCode }}
                    </option>
                  </select>
                  <div class="flex flex-wrap gap-2">
                    <button
                      class="button-primary px-2 py-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                      :disabled="detectionSaving[detected.id]"
                      @click="saveDetection(detected)"
                    >
                      Uložit
                    </button>
                    <button
                      class="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      :disabled="detectionSaving[detected.id]"
                      @click="clearConfirmedDialect(detected, close)"
                    >
                      Odebrat potvrzení
                    </button>
                    <button
                      class="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      :disabled="detectionSaving[detected.id]"
                      @click="deleteDetection(detected)"
                    >
                      Smazat záznam
                    </button>
                  </div>
                </div>
              </div>

              <div
                v-else
                class="space-y-2 pt-2 border-t border-gray-200"
              >
                <div class="text-xs font-semibold text-gray-700">
                  Potvrdit dialekt
                </div>

                <div
                  v-if="
                    getUnconfirmedConfirmableDetectionsForRange(rangeId).length
                  "
                  class="space-y-1 text-xs"
                >
                  <div class="text-[11px] text-gray-500">Rychlé potvrzení</div>
                  <div
                    v-for="detected in getUnconfirmedConfirmableDetectionsForRange(
                      rangeId
                    )"
                    :key="`confirmable-${detected.id}`"
                    class="flex flex-col gap-1"
                  >
                    <button
                      v-if="detected.predictedDialectId"
                      class="w-full px-2 py-1 border border-gray-200 rounded hover:bg-gray-50 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      :disabled="detectionSaving[detected.id]"
                      @click="
                        confirmExistingDetection(
                          detected,
                          detected.predictedDialectId,
                          close
                        )
                      "
                    >
                      Potvrdit model ({{
                        detected.predictedDialect ??
                        detected.predictedDialectId
                      }})
                    </button>
                    <button
                      v-if="detected.userGuessDialectId"
                      class="w-full px-2 py-1 border border-gray-200 rounded hover:bg-gray-50 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      :disabled="detectionSaving[detected.id]"
                      @click="
                        confirmExistingDetection(
                          detected,
                          detected.userGuessDialectId,
                          close
                        )
                      "
                    >
                      Potvrdit uživatel ({{
                        detected.userGuessDialect ??
                        detected.userGuessDialectId
                      }})
                    </button>
                  </div>
                </div>

                <select
                  v-model="tooltipConfirmedDialectId"
                  class="w-full text-xs border border-gray-300 rounded px-2 py-1"
                  :disabled="tooltipSaving"
                >
                  <option :value="null">Vyberte dialekt</option>
                  <option
                    v-for="dialect in availableDialects"
                    :key="dialect.id"
                    :value="dialect.id"
                  >
                    {{ dialect.dialectCode }}
                  </option>
                </select>
                <button
                  class="w-full button-primary px-2 py-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="
                    !tooltipConfirmedDialectId ||
                    tooltipSaving ||
                    !findRangeById(rangeId)?.payload
                  "
                  @click="
                    (() => {
                      const r = findRangeById(rangeId);
                      if (r?.payload) {
                        quickConfirmDialect(
                          r.payload,
                          tooltipConfirmedDialectId,
                          close
                        );
                      }
                    })()
                  "
                >
                  <span v-if="tooltipSaving">Ukládání...</span>
                  <span v-else>Potvrdit</span>
                </button>
              </div>
            </template>

            <button
              class="w-full text-xs text-gray-500 hover:text-gray-700 mt-2 pt-2 border-t border-gray-200"
              @click="
                tooltipConfirmedDialectId = null;
                tooltipCreateDialectId = null;
                tooltipAddDetectionDialectId = null;
                currentContextMenuRangeId = null;
                close();
              "
            >
              Zavřít
            </button>
          </div>
        </template>
      </Spectrogram>

      <div
        v-if="recording && recording.parts"
        class="flex flex-wrap items-center gap-3"
      >
        <label class="text-sm text-gray-700 flex flex-col gap-1">
          Dialekt pro nové úseky
          <select
            v-model="selectedDialectCode"
            class="border border-gray-300 rounded-md px-3 py-1 text-sm"
            :disabled="!canEditDialects"
          >
            <option
              v-for="dialect in availableDialects"
              :key="dialect.id"
              :value="dialect.dialectCode"
            >
              {{ dialect.dialectCode }}
            </option>
          </select>
        </label>

        <div class="flex flex-wrap gap-2 ml-auto">
          <button
            class="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isSavingSegments"
            @click="resetSegments"
          >
            Zrušit změny
          </button>
          <button
            class="button-primary px-4 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="
              !canEditDialects || !pendingSegmentChanges || isSavingSegments
            "
            @click="saveSegmentChanges"
          >
            Uložit úseky
          </button>
        </div>
      </div>

      <p
        v-if="!canEditDialects"
        class="text-sm text-gray-500"
      >
        Pro úpravy se prosím přihlaste.
      </p>

      <p
        v-if="segmentError"
        class="text-sm text-red-600"
      >
        {{ segmentError }}
      </p>
      <p
        v-if="segmentSuccess"
        class="text-sm text-emerald-600"
      >
        {{ segmentSuccess }}
      </p>

      <details>
        <summary>Úseky</summary>
        <section class="space-y-4">
          <article
            v-for="meta in activeSegmentMetas"
            :key="meta.key"
            class="border border-gray-200 rounded-lg p-4 space-y-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="text-sm font-semibold">
                  {{ formatRelativeTime(meta.start) }} –
                  {{ formatRelativeTime(meta.end) }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ formatAbsoluteFromSeconds(meta.start) }} →
                  {{ formatAbsoluteFromSeconds(meta.end) }}
                </p>
              </div>
              <div class="flex flex-wrap gap-2 text-xs uppercase text-gray-500">
                <span
                  v-if="meta.isNew"
                  class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full"
                >
                  Nový
                </span>
                <span
                  v-if="meta.dirty && !meta.isNew"
                  class="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full"
                >
                  Upravený
                </span>
                <span
                  v-if="meta.representant"
                  class="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full"
                >
                  Reprezentant
                </span>
              </div>
            </div>

            <div class="grid gap-3 md:grid-cols-2">
              <div class="text-sm text-gray-700 flex flex-col gap-1">
                <span>Dialekt úseku</span>
                <span
                  class="border border-gray-300 rounded-md px-3 py-1 text-sm bg-gray-50 text-gray-600"
                >
                  {{ meta.dialectCode ?? 'Nezadáno' }}
                </span>
              </div>

              <label
                class="text-sm text-gray-700 inline-flex items-center gap-2"
              >
                <input
                  type="checkbox"
                  class="rounded border-gray-300"
                  :checked="meta.representant"
                  :disabled="!canEditDialects"
                  @change="
                    toggleRepresentant(
                      meta,
                      ($event.target as HTMLInputElement).checked
                    )
                  "
                />
                Reprezentant
              </label>
            </div>

            <div class="flex flex-wrap justify-end">
              <button
                class="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!canEditDialects"
                @click="removeSegment(meta)"
              >
                Smazat úsek
              </button>
            </div>

            <div
              v-if="meta.filteredPart"
              class="space-y-3"
            >
              <h3 class="text-sm font-semibold">Detekované dialekty</h3>

              <div
                v-for="detected in meta.filteredPart.detectedDialects ?? []"
                :key="detected.id"
                class="border border-gray-200 rounded-md p-3 space-y-3"
              >
                <div class="text-xs text-gray-500">ID #{{ detected.id }}</div>

                <div class="flex flex-row w-full items-center gap-2 text-sm">
                  <label class="flex flex-col flex-1 gap-1">
                    Model
                    <span
                      class="border border-gray-300 rounded px-2 py-1 bg-gray-50 text-gray-600 cursor-not-allowed select-none min-h-9 flex items-center"
                    >
                      {{
                        (() => {
                          const id =
                            detectionForms[detected.id]?.predictedDialectId;
                          if (id == null) return 'Nezadán';
                          const dialect = availableDialects.find(
                            (d) => d.id === id
                          );
                          return dialect ? dialect.dialectCode : id;
                        })()
                      }}
                    </span>
                  </label>
                  <label
                    v-if="accountStore.user?.role === 'user'"
                    class="flex flex-col flex-1 gap-1"
                  >
                    Uživatel
                    <select
                      v-model="detectionForms[detected.id]!.userGuessDialectId"
                      class="border border-gray-300 rounded px-2 py-1"
                      :disabled="
                        !canEditDialects || detectionSaving[detected.id]
                      "
                    >
                      <option :value="null">Nezadán</option>
                      <option
                        v-for="dialect in availableDialects"
                        :key="dialect.id"
                        :value="dialect.id"
                      >
                        {{ dialect.dialectCode }}
                      </option>
                    </select>
                  </label>
                  <label
                    v-if="accountStore.user?.role === 'admin'"
                    class="flex flex-col flex-1 gap-1"
                  >
                    Potvrzený
                    <select
                      v-model="detectionForms[detected.id]!.confirmedDialectId"
                      class="border border-gray-300 rounded px-2 py-1"
                      :disabled="
                        !canEditDialects || detectionSaving[detected.id]
                      "
                    >
                      <option :value="null">Nezadán</option>
                      <option
                        v-for="dialect in availableDialects"
                        :key="dialect.id"
                        :value="dialect.id"
                      >
                        {{ dialect.dialectCode }}
                      </option>
                    </select>
                  </label>
                </div>

                <div class="flex flex-wrap gap-2">
                  <button
                    class="button-primary px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="!canEditDialects || detectionSaving[detected.id]"
                    @click="saveDetection(detected)"
                  >
                    Uložit
                  </button>
                  <button
                    class="danger px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="!canEditDialects || detectionSaving[detected.id]"
                    @click="deleteDetection(detected)"
                  >
                    Smazat
                  </button>
                </div>
              </div>

              <div
                class="border border-dashed border-gray-300 rounded-md p-3 space-y-2"
              >
                <p class="text-xs text-gray-500">Přidat nový záznam</p>
                <div class="flex flex-row w-full items-center gap-2 text-sm">
                  <label
                    v-if="accountStore.user?.role === 'user'"
                    class="flex flex-col flex-1 gap-1"
                  >
                    Uživatel
                    <select
                      v-model="newDetectionForms[meta.key]!.userGuessDialectId"
                      class="border border-gray-300 rounded px-2 py-1"
                      :disabled="
                        !canEditDialects || detectionCreateSaving[meta.key]
                      "
                    >
                      <option :value="null">Nezadán</option>
                      <option
                        v-for="dialect in availableDialects"
                        :key="dialect.id"
                        :value="dialect.id"
                      >
                        {{ dialect.dialectCode }}
                      </option>
                    </select>
                  </label>
                  <label
                    v-if="accountStore.user?.role === 'admin'"
                    class="flex flex-col flex-1 gap-1"
                  >
                    Potvrzený
                    <select
                      v-model="newDetectionForms[meta.key]!.confirmedDialectId"
                      class="border border-gray-300 rounded px-2 py-1"
                      :disabled="
                        !canEditDialects || detectionCreateSaving[meta.key]
                      "
                    >
                      <option :value="null">Nezadán</option>
                      <option
                        v-for="dialect in availableDialects"
                        :key="dialect.id"
                        :value="dialect.id"
                      >
                        {{ dialect.dialectCode }}
                      </option>
                    </select>
                  </label>
                </div>
                <button
                  class="button-primary px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="
                    !canEditDialects || detectionCreateSaving[meta.key]
                  "
                  @click="createDetection(meta)"
                >
                  Přidat záznam
                </button>
              </div>
            </div>
          </article>
        </section>
      </details>

      <section
        v-if="deletedSegmentMetas.length"
        class="space-y-2"
      >
        <h2 class="text-sm font-semibold">Úseky označené ke smazání</h2>
        <div
          v-for="meta in deletedSegmentMetas"
          :key="`deleted-${meta.key}`"
          class="border border-red-200 bg-red-50 rounded-md p-3 flex flex-wrap items-center justify-between gap-2"
        >
          <span class="text-sm text-red-800">
            {{ formatRelativeTime(meta.start) }} –
            {{ formatRelativeTime(meta.end) }}
          </span>
          <button
            class="px-3 py-1 text-sm border border-red-300 rounded-md text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!canEditDialects"
            @click="restoreSegment(meta)"
          >
            Vrátit zpět
          </button>
        </div>
      </section>

      <p
        v-if="detectionError"
        class="text-sm text-red-600"
      >
        {{ detectionError }}
      </p>
      <p
        v-if="detectionMessage"
        class="text-sm text-emerald-600"
      >
        {{ detectionMessage }}
      </p>
    </div>
  </template>
</template>
