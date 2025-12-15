<script lang="ts">
import mitt from '@/vendor/mitt';
import { reactive } from 'vue';
import { type LeafletMouseEvent } from 'leaflet';
import type { Polygon, Marker } from '@/views/map/Map.vue';
import { computedAsync, refDebounced } from '@vueuse/core';

// let positionStack = ref([
//   [ 49.9, 15.5, 8.25 ]
// ]);
// const currentCenter = computed<[number, number, number]>(() => positionStack.value[positionStack.value.length - 1] as [number, number, number]);

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
  unmove(): void;
  move(newCenter: [number, number], newZoom?: number, override?: boolean): void;
}>({
  scale: false,
  aerial: false,
  grouping: false,
  filter: 'new',
  markers: {},

  move(newCenter: [number, number], newZoom?: number, _override = false) {
    // if(!override) {
    //   positionStack.value.push([...newCenter, newZoom]);
    // } else {
    //   positionStack.value[positionStack.value.length - 1] = [...newCenter, newZoom];
    // }

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
  getDialectColors
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

function collectDialectMeta(parts: TimedFilteredPart[]): DialectMetaFlags {
  const confirmed: string[] = [];
  const predicted: string[] = [];
  const userGuess: string[] = [];

  for (const part of parts) {
    if (!part.representantFlag || !part.detectedDialects?.length) continue;

    for (const dialect of part.detectedDialects) {
      if (dialect.confirmedDialect) confirmed.push(dialect.confirmedDialect);
      if (dialect.predictedDialect) predicted.push(dialect.predictedDialect);
      if (dialect.userGuessDialect) userGuess.push(dialect.userGuessDialect);
    }
  }

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
  // Compare ignoring order
  const setA = new Set(colorsA);
  const setB = new Set(colorsB);
  if (setA.size !== setB.size) return false;
  for (const c of setA) if (!setB.has(c)) return false;

  // Set a threshold for the distance between the two markers
  const distance = L.latLng(a.position[0], a.position[1]).distanceTo(
    L.latLng(b.position[0], b.position[1])
  );
  if (distance > 70_000) return false;

  return true;
}

const allowedClustering = computed<[Marker, Marker][]>(() => {
  if (!MapStore.grouping) return [];

  const allowedPairs: [Marker, Marker][] = [];

  for (const m1 of allMarkers.value) {
    for (const m2 of allMarkers.value) {
      if (m1.id >= m2.id) continue; // avoid duplicates and self-comparison

      if (clusterTest(m1, m2)) {
        allowedPairs.push([m1, m2]);
      }
    }
  }
  return allowedPairs;
});

const { data: recordings } = useQuery({
  queryKey: ['all-recordings'],
  queryFn: () => getRecordings({ parts: true })
});

const { data: filteredRecordings } = useQuery({
  queryKey: ['filtered-parts'],
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
      // Leaflet polygons expect [lat, lng]
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
    ...(zoom.value >= 12 && zoom.value < 14 ? makeGrid(5 / 60, 3 / 60) : []),
    ...(zoom.value >= 14 ? makeGrid(2.5 / 60, 1.5 / 60) : [])
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

    const { dialects, fromModel, fromUser } =
      collectDialectMeta(relevantFiltered);
    const colors = dialects.map((code) => dialectColors[code] ?? '#000000');

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
        colors
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
      // Handle cases where polygon.position might be too short, though makeGrid should prevent this.
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
    :polygons="polygons"
    :markers="allMarkers"
    :allowed-clustering="allowedClustering"
    :mode="MapStore.aerial ? 'aerial' : 'outdoor'"
    :position="currentCenter"
    :zoom-control="true"
    @click="onClick"
  />
</template>
