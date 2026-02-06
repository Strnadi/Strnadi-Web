<route lang="yaml">
meta:
  layout: desktop/center
</route>

<script setup vapor lang="ts">
import { computed, reactive, ref, watch, onMounted, onUnmounted } from 'vue';
import Spectrogram from '@/views/Spectrogram.vue';
import { useRouteParams } from '@vueuse/router';
import { useRoute } from 'vue-router';
import { useDebounceFn } from '@vueuse/core';
import { useFetched, useFetchedWithOptions } from '@/utils/network';
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
  type RecordingModel,
  type RecordingPartModel,
  updateDetectedDialect
} from '@/api/recordings';
import { type Numeric } from '@/types/basic';
import TranslatedText from '@/components/TranslatedText.vue';
import { DialectColors } from '@/views/map/RecordingsMap.vue';
import { accountStore } from '@/state/AccountStore';
import {
  uploadStore,
  type DraftFilteredPart
} from '@/state/UploadDraftStore';

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
const route = useRoute();

const isDraftMode = computed(() => route.query?.draft === '1');

const recordingQuery = useFetchedWithOptions(
  getRecording,
  { enabled: computed(() => !isDraftMode.value) },
  id,
  false
);
const filteredPartsQuery = useFetchedWithOptions(
  getFilteredRecording,
  { enabled: computed(() => !isDraftMode.value) },
  id
);
const dialectDefinitionsQuery = useFetched(getDialects);

const draftRecording = ref<RecordingModel | null>(null);
const draftFilteredParts = ref<DraftFilteredPart[] | null>(null);
const draftLoading = ref(false);
const draftError = ref<Error | null>(null);
const draftAudioUrls = ref<string[]>([]);

const recording = computed(() =>
  isDraftMode.value ? draftRecording.value : recordingQuery.data.value
);

const filteredParts = computed<FilteredPartModel[] | null>(() =>
  isDraftMode.value
    ? (draftFilteredParts.value as unknown as FilteredPartModel[] | null)
    : filteredPartsQuery.data.value
);

const dialectDefinitions = computed(
  () => dialectDefinitionsQuery.data.value ?? []
);

const isLoading = computed(() =>
  isDraftMode.value
    ? draftLoading.value
    : recordingQuery.isLoading.value || filteredPartsQuery.isLoading.value
);

const error = computed(() =>
  isDraftMode.value ? draftError.value : recordingQuery.error.value
);

const refetchFilteredParts = async () => {
  if (isDraftMode.value) {
    draftFilteredParts.value = [...uploadStore.draftFilteredParts];
    return;
  }
  await filteredPartsQuery.refetch();
};

const getAudioDuration = (file: File): Promise<number> =>
  new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = 'metadata';

    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(audio.src);
      resolve(audio.duration || 0);
    };

    audio.onerror = () => {
      URL.revokeObjectURL(audio.src);
      reject(new Error('Nepodařilo se načíst délku audia.'));
    };

    audio.src = URL.createObjectURL(file);
  });

const hydrateDraftData = async () => {
  if (!isDraftMode.value) return;
  draftLoading.value = true;
  draftError.value = null;
  try {
    if (!uploadStore.parts?.length) {
      throw new Error('Nahrávka ještě nebyla připravena pro úpravy.');
    }

    let cursor = new Date(uploadStore.dateTime ?? new Date()).getTime();
    const parts = [] as RecordingPartModel[];
    draftAudioUrls.value.forEach((url) => URL.revokeObjectURL(url));
    const urls: string[] = [];

    for (const [index, part] of (uploadStore.parts ?? []).entries()) {
      const duration = await getAudioDuration(part.file);
      const startDate = new Date(cursor).toISOString();
      const endDate = new Date(cursor + duration * 1000).toISOString();

      urls.push(URL.createObjectURL(part.file));

      parts.push({
        id: index + 1,
        recordingId: 0,
        startDate,
        endDate,
        gpsLatitudeStart: part.location?.lat ?? 0,
        gpsLatitudeEnd: part.location?.lat ?? 0,
        gpsLongitudeStart: part.location?.lng ?? 0,
        gpsLongitudeEnd: part.location?.lng ?? 0,
        square: null,
        filePath: null,
        dataBase64: null
      });

      cursor += duration * 1000;
    }

    draftAudioUrls.value = urls;

    draftRecording.value = {
      id: 0,
      userId: accountStore.user?.id ?? 0,
      name: uploadStore.title || 'Nahrávka',
      createdAt: uploadStore.dateTime ?? new Date().toISOString(),
      estimatedBirdsCount: uploadStore.birdCount,
      byApp: false,
      device: uploadStore.device,
      note: uploadStore.note,
      notePost: null,
      parts
    };

    draftFilteredParts.value = [...uploadStore.draftFilteredParts];
  } catch (err) {
    draftError.value =
      err instanceof Error
        ? err
        : new Error('Nepodařilo se připravit návrh nahrávky.');
  } finally {
    draftLoading.value = false;
  }
};

onMounted(() => {
  if (isDraftMode.value) {
    hydrateDraftData();
  }
});

watch(isDraftMode, (draft) => {
  if (draft) {
    hydrateDraftData();
  }
});

watch(
  () => uploadStore.parts,
  () => {
    if (isDraftMode.value) {
      hydrateDraftData();
    }
  }
);

onUnmounted(() => {
  draftAudioUrls.value.forEach((url) => URL.revokeObjectURL(url));
});

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
const isOwner = computed(
  () => recording.value?.userId === accountStore.user?.id
);
const canConfirmDialects = computed(() => isAdmin.value);
const canGuessDialects = computed(() => Boolean(accountStore.user));
const canEditDialects = computed(
  () => isAdmin.value || isDraftMode.value || isOwner.value
);

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

const audioUrls = computed(() => {
  if (!recording.value?.parts) return [] as string[];
  if (isDraftMode.value) {
    return draftAudioUrls.value;
  }
  return recording.value.parts.map(
    (p) =>
      `${env.VITE_API_URL}/recordings/part/${recording.value?.id}/${p.id}/sound`
  );
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
  if (isDraftMode.value) {
    autoSaveDraft();
  }
});

watch(currentContextMenuRangeId, (rangeId) => {
  if (rangeId != null) {
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

const dialectIdLookup = computed<Record<string, number>>(() =>
  availableDialects.value.reduce((acc, dialect) => {
    acc[dialect.dialectCode] = dialect.id;
    return acc;
  }, {} as Record<string, number>)
);

function resolveDialectId(code?: string | null) {
  if (!code) return null;
  return dialectIdLookup.value[code] ?? null;
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

function findFilteredPartByTime(startDate: string, endDate: string) {
  const parts = filteredParts.value ?? [];
  const targetStart = convertIsoToRelative(startDate);
  const targetEnd = convertIsoToRelative(endDate);
  return (
    parts.find((part) => {
      const s = convertIsoToRelative(part.startDate);
      const e = convertIsoToRelative(part.endDate);
      return isApproximatelyEqual(s, targetStart) && isApproximatelyEqual(e, targetEnd);
    }) ?? null
  );
}

const autoConfirmDetectedDialect = async (
  part: FilteredPartModel,
  dialectId: number | null
) => {
  if (!canConfirmDialects.value || !dialectId) return;
  const detection = part.detectedDialects?.[0];
  if (!detection) return;
  await updateDetectedDialect(accountStore.token!, {
    id: detection.id,
    userGuessDialectId: detection.userGuessDialectId ?? dialectId,
    predictedDialectId: detection.predictedDialectId ?? null,
    confirmedDialectId: dialectId
  });
};

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

function hydrateSegments(parts: FilteredPartModel[] | null | undefined) {
  if (!Array.isArray(parts)) {
    return;
  }
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

function hydrateDetectionForms(parts: FilteredPartModel[] | null | undefined) {
  if (!Array.isArray(parts)) {
    return;
  }
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
  if (isDraftMode.value) {
    autoSaveDraft();
  }
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
  if (isDraftMode.value) {
    await saveDraftSegmentChanges(false);
    return;
  }
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
    const creationTargets: { startDate: string; endDate: string; dialectId: number | null }[] = [];
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
      creationTargets.push({
        startDate,
        endDate,
        dialectId: resolveDialectId(meta.dialectCode)
      });
    }
    await refetchFilteredParts();
    if (creationTargets.length && filteredParts.value) {
      for (const target of creationTargets) {
        const part = findFilteredPartByTime(target.startDate, target.endDate);
        if (part && target.dialectId) {
          await autoConfirmDetectedDialect(part, target.dialectId);
        }
      }
      await refetchFilteredParts();
    }
    segmentSuccess.value = 'Změny úseků byly uloženy.';
  } catch (err) {
    segmentError.value =
      err instanceof Error ? err.message : 'Nepodařilo se uložit změny úseků.';
  } finally {
    isSavingSegments.value = false;
  }
};

async function saveDraftSegmentChanges(silent = false) {
  if (anchorTimestamp.value === null) {
    if (!silent) segmentError.value = 'Není k dispozici časový základ pro nahrávku.';
    return;
  }

  const metas = Object.values(segmentMetas);
  const creations = metas.filter((meta) => meta.isNew);
  const updates = metas.filter(
    (meta) => !meta.isNew && meta.dirty && !meta.markedForDeletion
  );
  const deletions = metas.filter(
    (meta) => meta.markedForDeletion && !meta.isNew && meta.filteredPart
  );

  if (!creations.length && !updates.length && !deletions.length) {
    if (!silent) {
      segmentSuccess.value = 'Žádné změny k uložení.';
      segmentError.value = null;
    }
    return;
  }

  if (!silent) {
    segmentError.value = null;
    segmentSuccess.value = null;
    isSavingSegments.value = true;
  }

  try {
    for (const meta of deletions) {
      if (meta.filteredPart?.id) {
        uploadStore.deleteDraftFilteredPart(meta.filteredPart.id);
      }
    }

    for (const meta of updates) {
      const startDate = convertRelativeToIso(meta.start);
      const endDate = convertRelativeToIso(meta.end);
      if (!startDate || !endDate) {
        throw new Error('Nepodařilo se převést čas úseku.');
      }
      const partId = meta.filteredPart?.id ?? meta.key;
      uploadStore.updateDraftFilteredPart(partId, {
        startDate,
        endDate,
        representantFlag: meta.representant,
        state: meta.state,
        dialectCode: meta.dialectCode ?? null
      });

      const dialectId = resolveDialectId(meta.dialectCode);
      const draftPart = uploadStore.draftFilteredParts.find(
        (p) => p.id === partId
      );
      const firstDetection = draftPart?.detectedDialects?.[0];
      if (dialectId && firstDetection) {
        uploadStore.updateDraftDetection(firstDetection.id, {
          userGuessDialectId: dialectId,
          confirmedDialectId: canConfirmDialects.value ? dialectId : null
        });
      }
      meta.dirty = false;
      meta.originalStart = meta.start;
      meta.originalEnd = meta.end;
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
      const created = uploadStore.createDraftFilteredPart({
        parentId: 0,
        recordingId: 0,
        startDate,
        endDate,
        state: meta.state,
        representantFlag: meta.representant,
        dialectCode: meta.dialectCode,
        detectedDialects: []
      });
      const dialectId = resolveDialectId(meta.dialectCode);
      if (dialectId) {
        uploadStore.createDraftDetection(created.id, {
          userGuessDialectId: dialectId,
          predictedDialectId: null,
          confirmedDialectId: canConfirmDialects.value ? dialectId : null
        });
      }
      meta.filteredPart = created as unknown as FilteredPartModel;
      meta.isNew = false;
      meta.dirty = false;
    }

    draftFilteredParts.value = [...uploadStore.draftFilteredParts];
    hydrateSegments((draftFilteredParts.value ?? []) as FilteredPartModel[]);
    if (!silent) segmentSuccess.value = 'Změny úseků byly uloženy.';
  } catch (err) {
    segmentError.value =
      err instanceof Error ? err.message : 'Nepodařilo se uložit změny úseků.';
  } finally {
    if (!silent) isSavingSegments.value = false;
  }
}

const autoSaveDraft = useDebounceFn(async () => {
  if (!isDraftMode.value) return;
  await saveDraftSegmentChanges(true);
}, 1000);

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
    if (isDraftMode.value) {
      uploadStore.updateDraftDetection(detected.id, {
        userGuessDialectId: form.userGuessDialectId,
        predictedDialectId: form.predictedDialectId,
        confirmedDialectId: canConfirmDialects.value
          ? form.confirmedDialectId
          : detected.confirmedDialectId ?? null
      });
      detectionMessage.value = 'Záznam dialektu byl uložen.';
      draftFilteredParts.value = [...uploadStore.draftFilteredParts];
    } else {
      await updateDetectedDialect(accountStore.token!, {
        id: detected.id,
        userGuessDialectId: form.userGuessDialectId,
        predictedDialectId: form.predictedDialectId,
        confirmedDialectId: canConfirmDialects.value
          ? form.confirmedDialectId
          : detected.confirmedDialectId ?? null
      });
      detectionMessage.value = 'Záznam dialektu byl uložen.';
      await refetchFilteredParts();
    }
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
    if (isDraftMode.value) {
      uploadStore.deleteDraftDetection(detected.id);
      detectionMessage.value = 'Záznam dialektu byl odstraněn.';
      draftFilteredParts.value = [...uploadStore.draftFilteredParts];
    } else {
      await deleteDetectedDialect(accountStore.token!, detected.id);
      detectionMessage.value = 'Záznam dialektu byl odstraněn.';
      await refetchFilteredParts();
    }
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
    if (isDraftMode.value) {
      const created = uploadStore.createDraftDetection(meta.filteredPart.id, {
        userGuessDialectId: form.userGuessDialectId,
        predictedDialectId: form.predictedDialectId,
        confirmedDialectId: canConfirmDialects.value
          ? form.confirmedDialectId
          : null
      });
      meta.filteredPart.detectedDialects ??= [];
      meta.filteredPart.detectedDialects.push(
        created as unknown as DetectedDialect
      );
      draftFilteredParts.value = [...uploadStore.draftFilteredParts];
      detectionMessage.value = 'Záznam dialektu byl přidán.';
    } else {
      await postDetectedDialect(accountStore.token!, {
        filteredPartId: meta.filteredPart.id,
        userGuessDialectId: form.userGuessDialectId,
        predictedDialectId: form.predictedDialectId,
        confirmedDialectId: canConfirmDialects.value
          ? form.confirmedDialectId
          : null
      });
      detectionMessage.value = 'Záznam dialektu byl přidán.';
      await refetchFilteredParts();
    }
    newDetectionForms[meta.key] = {
      userGuessDialectId: null,
      predictedDialectId: null,
      confirmedDialectId: null
    };
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

const getDetectedDialectsForRange = (
  rangeId: Numeric | number | null
): DetectedDialect[] => {
  const range = findRangeById(rangeId);
  return range?.payload?.filteredPart?.detectedDialects ?? [];
};

const confirmExistingDetection = async (
  detected: DetectedDialect,
  dialectId: number | null,
  close?: () => void
) => {
  if (!canConfirmDialects.value) {
    detectionError.value = 'Nemáte oprávnění potvrdit dialekt.';
    return;
  }
  if (!dialectId) {
    detectionError.value = 'Vyberte dialekt k potvrzení.';
    return;
  }
  const form = ensureDetectionForm(detected);
  detectionSaving[detected.id] = true;
  detectionError.value = null;
  detectionMessage.value = null;
  try {
    if (isDraftMode.value) {
      uploadStore.updateDraftDetection(detected.id, {
        userGuessDialectId: form.userGuessDialectId,
        predictedDialectId: form.predictedDialectId,
        confirmedDialectId: dialectId
      });
      detectionMessage.value = 'Dialekt byl potvrzen.';
      if (close) close();
      draftFilteredParts.value = [...uploadStore.draftFilteredParts];
    } else {
      await updateDetectedDialect(accountStore.token!, {
        id: detected.id,
        userGuessDialectId: form.userGuessDialectId,
        predictedDialectId: form.predictedDialectId,
        confirmedDialectId: dialectId
      });
      detectionMessage.value = 'Dialekt byl potvrzen.';
      if (close) close();
      await refetchFilteredParts();
    }
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
  if (!canConfirmDialects.value) {
    detectionError.value = 'Nemáte oprávnění odebrat potvrzení.';
    return;
  }
  const form = ensureDetectionForm(detected);
  detectionSaving[detected.id] = true;
  detectionError.value = null;
  detectionMessage.value = null;
  try {
    if (isDraftMode.value) {
      uploadStore.updateDraftDetection(detected.id, {
        userGuessDialectId: form.userGuessDialectId,
        predictedDialectId: form.predictedDialectId,
        confirmedDialectId: null
      });
      detectionMessage.value = 'Potvrzený dialekt byl odebrán.';
      if (close) close();
      draftFilteredParts.value = [...uploadStore.draftFilteredParts];
    } else {
      await updateDetectedDialect(accountStore.token!, {
        id: detected.id,
        userGuessDialectId: form.userGuessDialectId,
        predictedDialectId: form.predictedDialectId,
        confirmedDialectId: null
      });
      detectionMessage.value = 'Potvrzený dialekt byl odebrán.';
      if (close) close();
      await refetchFilteredParts();
    }
  } catch (err) {
    detectionError.value =
      err instanceof Error
        ? err.message
        : 'Nepodařilo se odebrat potvrzení dialektu.';
  } finally {
    detectionSaving[detected.id] = false;
  }
};

const quickCreateFilteredPart = async (
  range: SpectrogramRange,
  dialectId: number | null,
  close?: () => void
) => {
  if (!recording.value && !isDraftMode.value) {
    segmentError.value = 'Chybí metadata nahrávky.';
    return;
  }
  if (!Number.isFinite(range.start) || !Number.isFinite(range.end)) {
    segmentError.value = 'Úsek nemá platný čas.';
    return;
  }
  if (dialectId == null) {
    segmentError.value = 'Vyberte dialekt pro nový úsek.';
    return;
  }
  const dialect = availableDialects.value.find((d) => d.id === dialectId);
  if (!dialect) {
    segmentError.value = 'Vybraný dialekt nebyl nalezen.';
    return;
  }
  const startDate = convertRelativeToIso(range.start);
  const endDate = convertRelativeToIso(range.end);
  if (!startDate || !endDate) {
    segmentError.value = 'Nepodařilo se převést čas úseku.';
    return;
  }
  tooltipCreateSaving.value = true;
  segmentError.value = null;
  segmentSuccess.value = null;
  try {
    if (isDraftMode.value) {
      const created = uploadStore.createDraftFilteredPart({
        parentId: 0,
        recordingId: 0,
        startDate,
        endDate,
        state: 0,
        representantFlag: false,
        dialectCode: dialect.dialectCode,
        detectedDialects: []
      });
      uploadStore.createDraftDetection(created.id, {
        userGuessDialectId: dialect.id,
        predictedDialectId: null,
        confirmedDialectId: canConfirmDialects.value ? dialect.id : null
      });
      draftFilteredParts.value = [...uploadStore.draftFilteredParts];
      hydrateSegments((draftFilteredParts.value ?? []) as FilteredPartModel[]);
    } else {
      await postFilteredPart(accountStore.token!, {
        recordingId: recording.value.id,
        startDate,
        endDate,
        dialectCode: dialect.dialectCode
      });
      await refetchFilteredParts();
      const part = findFilteredPartByTime(startDate, endDate);
      if (part) {
        await autoConfirmDetectedDialect(part, dialect.id);
        await refetchFilteredParts();
      }
    }
    tooltipCreateDialectId.value = null;
    currentContextMenuRangeId.value = null;
    segmentSuccess.value = 'Úsek byl vytvořen.';
    if (close) close();
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
  close?: () => void
) => {
  if (!meta.filteredPart) {
    detectionError.value = 'Nejprve uložte úsek.';
    return;
  }
  if (dialectId == null) {
    detectionError.value = 'Vyberte dialekt pro záznam.';
    return;
  }
  tooltipAddDetectionSaving.value = true;
  detectionError.value = null;
  detectionMessage.value = null;
  try {
    if (isDraftMode.value) {
      uploadStore.createDraftDetection(meta.filteredPart.id, {
        userGuessDialectId: dialectId,
        predictedDialectId: null,
        confirmedDialectId: canConfirmDialects.value ? dialectId : null
      });
      draftFilteredParts.value = [...uploadStore.draftFilteredParts];
    } else {
      await postDetectedDialect(accountStore.token!, {
        filteredPartId: meta.filteredPart.id,
        userGuessDialectId: canConfirmDialects.value ? null : dialectId,
        predictedDialectId: null,
        confirmedDialectId: canConfirmDialects.value ? dialectId : null
      });
      await refetchFilteredParts();
    }
    tooltipAddDetectionDialectId.value = null;
    currentContextMenuRangeId.value = null;
    detectionMessage.value = 'Záznam dialektu byl přidán.';
    if (close) close();
  } catch (err) {
    detectionError.value =
      err instanceof Error
        ? err.message
        : 'Nepodařilo se přidat záznam dialektu.';
  } finally {
    tooltipAddDetectionSaving.value = false;
  }
};

const confirmAll = async () => {
  if (!canConfirmDialects.value) {
    detectionError.value = 'Nemáte oprávnění potvrdit dialekty.';
    return;
  }
  detectionError.value = null;
  detectionMessage.value = null;
  const token = accountStore.token!;
  try {
    const metas = Object.values(segmentMetas).filter(
      (meta) => !meta.markedForDeletion && meta.filteredPart
    );
    for (const meta of metas) {
      const detected = meta.filteredPart!.detectedDialects ?? [];
      for (const entry of detected) {
        if (!entry.confirmedDialectId) {
          const dialectId =
            entry.predictedDialectId ?? entry.userGuessDialectId ?? null;
          if (dialectId) {
            if (isDraftMode.value) {
              uploadStore.updateDraftDetection(entry.id, {
                confirmedDialectId: dialectId
              });
            } else {
              await updateDetectedDialect(token, {
                id: entry.id,
                userGuessDialectId: entry.userGuessDialectId,
                predictedDialectId: entry.predictedDialectId,
                confirmedDialectId: dialectId
              });
            }
          }
        }
      }
    }
    detectionMessage.value = 'Všechny dialekty byly potvrzeny.';
    if (isDraftMode.value) {
      draftFilteredParts.value = [...uploadStore.draftFilteredParts];
    } else {
      await refetchFilteredParts();
    }
  } catch (err) {
    detectionError.value =
      err instanceof Error
        ? err.message
        : 'Nepodařilo se potvrdit všechny dialekty.';
  }
};
</script>

<template>
  <h1>
    <TranslatedText identifier="recordings.detail.edit_dialects_title" />
  </h1>

  <div class="mt-4 space-y-2">
    <div
      v-if="error || segmentError || detectionError"
      class="p-3 rounded-md bg-red-50 text-red-700 border border-red-200"
      role="alert"
    >
      <strong class="font-semibold mr-2">Chyba:</strong>
      <span>{{ segmentError ?? detectionError ?? error?.message }}</span>
    </div>

    <div
      v-if="segmentSuccess || detectionMessage"
      class="p-3 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200"
      role="status"
    >
      <strong class="font-semibold mr-2">Hotovo:</strong>
      <span>{{ segmentSuccess ?? detectionMessage }}</span>
    </div>

    <div
      v-if="isLoading"
      class="p-3 rounded-md bg-blue-50 text-blue-700 border border-blue-200"
      role="status"
    >
      <strong class="font-semibold mr-2">Načítání:</strong>
      <span><TranslatedText identifier="loading" /></span>
    </div>

    <div
      v-if="isSavingSegments"
      class="p-3 rounded-md bg-blue-50 text-blue-700 border border-blue-200"
      role="status"
    >
      <strong class="font-semibold mr-2">Ukládání</strong>
    </div>

  </div>

  <template v-if="!isLoading">
    <div
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
        :audio-urls="audioUrls"
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
            class="min-w-50 space-y-2 p-2"
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
              <!-- <div class="text-gray-500 mt-1">
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
                    return `${formatAbsoluteFromSeconds(r.start)} → ${formatAbsoluteFromSeconds(r.end)}`;
                  })()
                }}
              </div> -->
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

            <!-- Manage detected dialects on existing filtered part -->
            <div
              v-if="
                findRangeById(rangeId)?.payload?.filteredPart && canEditDialects
              "
              class="space-y-2 pt-2 border-t border-gray-200"
            >
              <div class="text-xs font-semibold text-gray-700">
                Záznamy dialektů
              </div>
              <p
                v-if="!getDetectedDialectsForRange(rangeId).length"
                class="text-xs text-gray-500"
              >
                Žádné záznamy pro tento úsek.
              </p>
              <div
                v-for="detected in getDetectedDialectsForRange(rangeId)"
                :key="`detected-${detected.id}`"
                class="border border-gray-200 rounded px-2 py-2 space-y-2 bg-gray-50"
              >
                <div class="flex flex-row w-full justify-between">
                  <div class="text-[11px] text-gray-500" v-if="isAdmin">
                    ID #{{ detected.id }}
                  </div>

                  <label
                    class="text-[11px] text-gray-700 inline-flex items-center gap-2"
                    v-if="canConfirmDialects"
                  >
                    <input
                      type="checkbox"
                      class="rounded border-gray-300"
                      :checked="findRangeById(rangeId)?.payload?.representant"
                      :disabled="!canEditDialects"
                      @change="
                        toggleRepresentant(
                          findRangeById(rangeId)?.payload,
                          ($event.target as HTMLInputElement).checked
                        )
                      "
                    />
                    Reprezentant
                  </label>
                </div>
                <div class="text-[11px] text-gray-500 flex flex-col gap-0.5">
                  <span v-if="isAdmin">
                    Model:
                    {{
                      detected.predictedDialect ??
                      detected.predictedDialectId ??
                      'Nezadán'
                    }}
                  </span>
                  <span v-if="detected.userGuessDialectId">
                    Uživatel:
                    {{
                      detected.userGuessDialect ?? detected.userGuessDialectId
                    }}
                  </span>
                  <span
                    :class="[
                      'font-semibold',
                      detected.confirmedDialectId
                        ? 'text-emerald-600'
                        : 'text-amber-600'
                    ]"
                  >
                    {{
                      detected.confirmedDialectId
                        ? `Potvrzeno: ${
                            detected.confirmedDialect ??
                            detected.confirmedDialectId
                          }`
                        : 'Nepotvrzeno'
                    }}
                  </span>
                </div>

                <div
                  v-if="
                    canConfirmDialects &&
                    !detected.confirmedDialectId &&
                    (detected.predictedDialectId || detected.userGuessDialectId)
                  "
                  class="space-y-1 text-xs"
                >
                  <div class="text-[11px] text-gray-500">Rychlé potvrzení</div>
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
                      detected.predictedDialect ?? detected.predictedDialectId
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
                      detected.userGuessDialect ?? detected.userGuessDialectId
                    }})
                  </button>
                </div>

                <div class="flex flex-row gap-x-2">
                  <select
                    v-if="canConfirmDialects"
                    v-model="detectionForms[detected.id]!.confirmedDialectId"
                    class="text-xs border border-gray-300 rounded px-2 py-1 flex-1"
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
                  <select
                    v-else
                    v-model="detectionForms[detected.id]!.userGuessDialectId"
                    class="text-xs border border-gray-300 rounded px-2 py-1 flex-1"
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
                  <div class="flex flex-row gap-1">
                    <button
                      class="button-primary px-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                      :disabled="
                        detectionSaving[detected.id] || !canGuessDialects
                      "
                      @click="saveDetection(detected)"
                    >
                      Uložit
                    </button>
                    <!-- <button
                      v-if="detected.confirmedDialectId"
                      class="px-2 text-xs border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      :disabled="detectionSaving[detected.id]"
                      @click="clearConfirmedDialect(detected, close)"
                    >
                      Odebrat potvrzení
                    </button> -->
                    <button
                      class="px-2 text-xs border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      :disabled="detectionSaving[detected.id]"
                      @click="deleteDetection(detected)"
                    >
                      Smazat záznam
                    </button>
                  </div>
                </div>
              </div>

              <template v-if="getDetectedDialectsForRange(rangeId).length == 0">
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
                    !findRangeById(rangeId)?.payload ||
                    !canGuessDialects
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
              </template>
            </div>

            <button
              v-if="canEditDialects && findRangeById(rangeId)"
              class="w-full text-xs text-red-600 hover:text-red-700 font-semibold pt-2 border-t border-gray-200"
              @click="
                (() => {
                  const r = findRangeById(rangeId);
                  if (r?.payload) {
                    removeSegment(r.payload);
                    close();
                  }
                })()
              "
            >
              Smazat celý úsek
            </button>

            <button
              class="w-full text-xs text-gray-500 hover:text-gray-700 mt-2 pt-2 border-t border-gray-200"
              @click="
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
          <button @click="confirmAll" class="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed" :disabled="isSavingSegments" v-if="canConfirmDialects">
            Potvrdit všechny dialekty
          </button>
          <button
            class="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isSavingSegments"
            @click="resetSegments"
          >
            Zrušit změny
          </button>
          <button
            v-if="!isDraftMode"
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
    </div>
  </template>
</template>
