<script lang="ts">
import mitt from '@/vendor/mitt';
import { reactive } from 'vue';
import { type LeafletMouseEvent } from 'leaflet';
import type { Polygon, Marker } from '@/views/map/Map.vue';
import { computedAsync, refDebounced } from '@vueuse/core';

const currentCenter = ref<[number, number, number]>([49.9, 15.5, 8.25]);

export type MapFilter = 'all' | 'new' | 'old' | 'my' | 'others' | 'any-dialect';
export interface MapClickEvent {
  event: LeafletMouseEvent;
  recording?: RecordingModel;
  recordingPart?: RecordingPartModel;
  square?: string;
}

export const DialectColors = computedAsync(
  async () => await getDialectColors()
);

export const MapEvents = mitt<{
  click: MapClickEvent;
}>();

export const MapStore = reactive<{
  markers: Record<string, Marker>;
  scale: boolean;
  aerial: boolean;
  filter: MapFilter;
  grouping: boolean;
  onlyDialects: boolean;
  /** When true the Map component uses leaflet.glify for WebGL rendering. */
  glify: boolean;
  unmove(): void;
  move(newCenter: [number, number], newZoom?: number, override?: boolean): void;
}>({
  scale: false,
  aerial: false,
  grouping: false,
  filter: 'new',
  onlyDialects: false,
  /** Default to glify — drastically faster for large datasets. */
  glify: true,
  markers: {},

  move(newCenter: [number, number], newZoom?: number, _override = false) {
    currentCenter.value = [...newCenter, newZoom ?? currentCenter.value[2]];
  },

  unmove() {
    // positionStack.value.pop();
  }
});
</script>

<script setup vapor lang="ts">
import { ref, computed } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import {
  getRecordings,
  getFilteredRecordings,
  getDialectColors,
  type DetectedDialect
} from '@/api/recordings';

import { accountStore } from '@/state/AccountStore';

import Map from '@/views/map/Map.vue';
import {
  type FilteredPartModel,
  type RecordingModel,
  type RecordingPartModel
} from '@/api/recordings';
import { divIcon, type Icon } from 'leaflet';

import L from 'leaflet';

const props = defineProps<{
  selectionMode?: boolean;
}>();

type TimedFilteredPart = FilteredPartModel & {
  startMs: number;
  endMs: number;
};

type PartRange = { start: number; end: number };
type FilteredPartsMap = Map<number, TimedFilteredPart[]>;

interface DialectMetaFlags {
  dialects: string[];
  fromModel: boolean;
  fromUser: boolean;
}

function buildPartRanges(parts: RecordingPartModel[]): PartRange[] {
  return parts.map((part) => ({
    start: Date.parse(part.startDate),
    end: Date.parse(part.endDate)
  }));
}

function overlapsRecording(
  part: TimedFilteredPart,
  ranges: PartRange[]
): boolean {
  return ranges.some(
    ({ start, end }) => part.endMs >= start && part.startMs <= end
  );
}

function fltr(parts: TimedFilteredPart[], thing: keyof DetectedDialect) {
  const hasRepresentants = parts.some((part) => part.representantFlag);

  return parts.flatMap((part) =>
    (hasRepresentants ? part.representantFlag : true)
      ? (part.detectedDialects ?? [])
          .filter((dd) => dd[thing])
          .map((dd) => dd[thing] as DetectedDialect[typeof thing])
      : []
  );
}

function collectDialectMeta(parts: TimedFilteredPart[]): DialectMetaFlags {
  const confirmed: string[] = fltr(parts, 'confirmedDialect');
  const predicted: string[] = fltr(parts, 'predictedDialect');
  const userGuess: string[] = fltr(parts, 'userGuessDialect');

  if (confirmed.length) {
    return { dialects: confirmed, fromModel: false, fromUser: false };
  }
  if (predicted.length) {
    return { dialects: predicted, fromModel: true, fromUser: false };
  }
  if (userGuess.length) {
    return { dialects: userGuess, fromModel: false, fromUser: true };
  }

  return { dialects: ['None'], fromModel: false, fromUser: false };
}

function getIconDimensions() {
  const isMobile =
    typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  return {
    iconSize: isMobile ? 20 : 16,
    iconAnchor: isMobile ? 10 : 8
  };
}

function matchesMapFilter(
  recording: RecordingModel,
  filter: MapFilter,
  createdAtMs: number,
  userId: number | undefined,
  oldCutoffMs: number,
  filteredParts: FilteredPartsMap
): boolean {
  switch (filter) {
    case 'my':
      return recording.userId === userId;
    case 'others':
      return recording.userId !== userId;
    case 'old':
      return createdAtMs <= oldCutoffMs;
    case 'new':
      return createdAtMs > oldCutoffMs;
    case 'any-dialect':
      return (
        filteredParts
          .get(recording.id)
          ?.some((fp) => fp.detectedDialects !== null) ?? false
      );
    default:
      return true;
  }
}

// Helper to compare dialect color sets for clustering
function clusterTest(a: Marker, b: Marker): boolean {
  if (MapStore.grouping === false) return false;

  const colorsA = (a.data?.colors ?? []) as string[];
  const colorsB = (b.data?.colors ?? []) as string[];
  if (colorsA.length !== colorsB.length) return false;
  const setA = new Set(colorsA);
  const setB = new Set(colorsB);
  if (setA.size !== setB.size) return false;
  for (const c of setA) if (!setB.has(c)) return false;

  const distance = L.latLng(a.position[0], a.position[1]).distanceTo(
    L.latLng(b.position[0], b.position[1])
  );
  if (distance > 70_000) return false;

  return true;
}

const allowedClustering = computed<[Marker, Marker][]>(() => {
  // Clustering is not used in glify mode
  if (MapStore.glify || !MapStore.grouping) return [];

  const allowedPairs: [Marker, Marker][] = [];

  for (const m1 of allMarkers.value) {
    for (const m2 of allMarkers.value) {
      if (m1.id >= m2.id) continue;

      if (clusterTest(m1, m2)) {
        allowedPairs.push([m1, m2]);
      }
    }
  }
  return allowedPairs;
});

const { data: recordings } = useQuery({
  queryKey: ['recordings'],
  queryFn: () => getRecordings({ parts: true })
});

const { data: filteredRecordings } = useQuery({
  queryKey: ['filtered-recordings'],
  queryFn: () => getFilteredRecordings()
});

const filteredPartsByRecordingId = computed<FilteredPartsMap>(() => {
  const map = new globalThis.Map<number, TimedFilteredPart[]>();
  for (const part of filteredRecordings.value ?? []) {
    const enhanced: TimedFilteredPart = {
      ...part,
      startMs: Date.parse(part.startDate),
      endMs: Date.parse(part.endDate)
    };

    const existing = map.get(part.recordingId);
    if (existing) {
      existing.push(enhanced);
    } else {
      map.set(part.recordingId, [enhanced]);
    }
  }
  return map;
});

// --- Grids ---
const fixed = { minLon: 12, maxLon: 19.5, minLat: 48.5, maxLat: 51.5 };
const viewBounds = ref<
  [north: number, south: number, west: number, east: number] | null
>(null);

function makeGrid(stepLon: number, stepLat: number): Polygon[] {
  if (!viewBounds.value) return [];
  const [maxLatView, minLatView, minLonView, maxLonView] = viewBounds.value;
  const bufLon = stepLon * 1.5;
  const bufLat = stepLat * 1.5;
  const minLon = Math.max(fixed.minLon, minLonView - bufLon);
  const maxLon = Math.min(fixed.maxLon, maxLonView + bufLon);
  const minLat = Math.max(fixed.minLat, minLatView - bufLat);
  const maxLat = Math.min(fixed.maxLat, maxLatView + bufLat);
  const startLon =
    fixed.minLon + Math.floor((minLon - fixed.minLon) / stepLon) * stepLon;
  const startLat =
    fixed.minLat + Math.floor((minLat - fixed.minLat) / stepLat) * stepLat;
  const polys: Polygon[] = [];
  for (let lon = startLon; lon < maxLon; lon += stepLon) {
    for (let lat = startLat; lat < maxLat; lat += stepLat) {
      const lon1 = lon,
        lat1 = lat;
      const lon2 = lon + stepLon,
        lat2 = lat + stepLat;
      if (
        lon2 <= fixed.minLon ||
        lon1 >= fixed.maxLon ||
        lat2 <= fixed.minLat ||
        lat1 >= fixed.maxLat
      )
        continue;
      const id = `${stepLon}-${lon1.toFixed(4)}-${lat1.toFixed(4)}`;
      const coordsLatLng: [number, number][] = [
        [lat1, lon1],
        [lat1, lon2],
        [lat2, lon2],
        [lat2, lon1],
        [lat1, lon1]
      ];
      polys.push({
        id,
        color: 'rgba(0,0,0,0.3)',
        weight: 1,
        position: coordsLatLng
      });
    }
  }
  return polys;
}

const zoom = ref<number>(0);

const polygons = refDebounced(
  computed<Polygon[]>(() => [
    ...(zoom.value > 10 && zoom.value < 12 ? makeGrid(10 / 60, 6 / 60) : []),
    ...(zoom.value >= 12 && zoom.value < 14 ? makeGrid(5 / 60, 3 / 60) : [])
  ]),
  75
);

const oldCutoff = new Date(2024, 11, 31);
const oldCutoffMs = oldCutoff.getTime();

const markers = computed<Marker[]>(() => {
  const dialectColors = DialectColors.value;
  if (!dialectColors) return [];

  const { iconSize, iconAnchor } = getIconDimensions();
  const filteredMap = filteredPartsByRecordingId.value;
  const userId = accountStore.user?.id;
  const filter = MapStore.filter;
  const result: Marker[] = [];

  for (const rec of recordings.value ?? []) {
    const createdAtMs = Date.parse(rec.createdAt);
    if (
      !matchesMapFilter(
        rec,
        filter,
        createdAtMs,
        userId,
        oldCutoffMs,
        filteredMap
      )
    ) {
      continue;
    }

    const parts = rec.parts ?? [];
    if (parts.length === 0) continue;
    const lastPart = parts[parts.length - 1]!;

    const filteredForRecording = filteredMap.get(rec.id);
    let relevantFiltered: TimedFilteredPart[] = [];
    if (filteredForRecording?.length) {
      const partRanges = buildPartRanges(parts);
      relevantFiltered = filteredForRecording.filter((fp) =>
        overlapsRecording(fp, partRanges)
      );
    }

    let { dialects, fromModel, fromUser } =
      collectDialectMeta(relevantFiltered);

    let dedupedDialects = new Set(dialects);
    dialects = [...dedupedDialects.values()];

    if (MapStore.onlyDialects) {
      if (dialects.every((d) => d === 'None' || d === 'Unfinished')) continue;
    }

    const colors = dialects.map((code) => dialectColors[code] ?? '#000000');

    // When glify is enabled the icon is never rendered (WebGL draws a circle
    // using marker.data.colors[0]), but we still create a lightweight divIcon
    // so the Marker interface is satisfied and the DOM cluster path works as
    // a fallback when glify is toggled off at runtime.
    const icon = divIcon({
      className: '',
      iconSize: [iconSize, iconSize],
      iconAnchor: [iconAnchor, iconAnchor],
      html: `<multi-color-square size="100%" dot="${fromModel}" questionmark="${fromUser}" colors='${JSON.stringify(colors)}'></multi-color-square>`
    });

    result.push({
      id: `${rec.id}-${lastPart.id}`,
      icon: icon as Icon,
      position: [lastPart.gpsLatitudeStart, lastPart.gpsLongitudeStart] as [
        number,
        number
      ],
      data: {
        recording: rec,
        part: lastPart,
        colors,
        fromModel,
        fromUser
      }
    });
  }

  return result;
});

const onClick = ({
  event,
  polygon,
  marker
}: {
  event: LeafletMouseEvent;
  polygon?: Polygon;
  marker?: Marker;
}) => {
  event.originalEvent.stopPropagation();

  if (marker) {
    MapEvents.emit('click', {
      event,
      recording: marker.data.recording,
      recordingPart: marker.data.part
    });
  } else if (polygon) {
    if (!polygon.position) return;

    const p0 = polygon.position[0];
    const p2 = polygon.position[2];

    if (p0 && p2) {
      const lat = ((p0[0] ?? 0) + (p2[0] ?? 0)) / 2;
      const lng = ((p0[1] ?? 0) + (p2[1] ?? 0)) / 2;

      const y = Math.floor(560 - lat * 10);
      const x = Math.floor(lng * 6 - 34);

      MapEvents.emit('click', { event, square: `${y}${x}` });
    } else {
      console.warn('Polygon clicked with unexpected structure:', polygon);
      return;
    }
  } else {
    MapEvents.emit('click', { event });
  }
};

const allMarkers = computed<Marker[]>(() => [
  ...(markers.value ?? []),
  ...Object.values(MapStore.markers)
]);
</script>

<template>
  <Map
    v-model:bounds="viewBounds"
    v-model:zoom="zoom"
    :scale-bar="MapStore.scale"
    :polygons="!props.selectionMode ? polygons : []"
    :markers="
      !props.selectionMode ? allMarkers : Object.values(MapStore.markers)
    "
    :allowed-clustering="allowedClustering"
    :mode="MapStore.aerial ? 'aerial' : 'outdoor'"
    :position="currentCenter"
    :zoom-control="true"
    :use-glify="allMarkers.length > 1000 && !props.selectionMode"
    @click="onClick"
  />
</template>
