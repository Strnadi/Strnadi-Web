<script lang="ts">
import mitt from '@/vendor/mitt';
import { reactive } from 'vue';
import type { LeafletMouseEvent } from 'leaflet';
import type { Marker } from '@/views/map/Map.vue';
import { computedAsync } from '@vueuse/core';
import { getDialectColors } from '@/api/recordings';
import { projectStore } from '@/state/ProjectStore';
import type { RecordingModel, RecordingPartModel } from '@/api/recordings';

export type MapFilter = 'all' | 'new' | 'old' | 'my' | 'others' | 'any-dialect';

export interface MapClickEvent {
  event: LeafletMouseEvent;
  recording?: RecordingModel;
  recordingPart?: RecordingPartModel;
  recordingId?: number;
  recordingPartId?: number;
  square?: string;
}

export const DialectColors = computedAsync(
  async () => await getDialectColors(projectStore.current.apiUrl)
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
  hideOthersUnfinished: boolean;
  center: [latitude: number, longitude: number, zoom: number];
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
  hideOthersUnfinished: true,
  center: [49.9, 15.5, 8.25],
  glify: false,
  markers: {},

  move(newCenter: [number, number], newZoom?: number, _override = false) {
    this.center = [newCenter[0], newCenter[1], newZoom ?? this.center[2]];
  },

  unmove() {
    // positionStack.value.pop();
  }
});
</script>

<script setup vapor lang="ts">
import { computed, ref } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { refDebounced } from '@vueuse/core';
import { divIcon, type Icon, type LeafletMouseEvent } from 'leaflet';
import L from 'leaflet';

import {
  getRecordingMapClusterItems,
  getRecordingMapClusters
} from '@/api/recordings';
import type {
  RecordingMapClusterFeature,
  RecordingMapClusterItem,
  RecordingMapClustersQuery,
  RecordingMapFeature,
  RecordingMapSource
} from '@/api/recordings';
import { accountStore } from '@/state/AccountStore';
import Map from '@/views/map/Map.vue';
import type { Marker, Polygon } from '@/views/map/Map.vue';

const props = defineProps<{
  selectionMode?: boolean;
}>();

const publicDataEnabled = computed(() => !props.selectionMode);
const fixed = { minLon: 12, maxLon: 19.5, minLat: 48.5, maxLat: 51.5 };
const oldCutoffDate = '2024-12-31';

const viewBounds = ref<
  [north: number, south: number, west: number, east: number] | null
>(null);
const zoom = ref(0);

const mapRequest = refDebounced(
  computed<RecordingMapClustersQuery | null>(() => {
    if (!viewBounds.value) return null;

    const [north, south, west, east] = viewBounds.value;
    const userId = accountStore.user?.id;
    const ownerScope =
      userId && MapStore.filter === 'my'
        ? 1
        : userId && MapStore.filter === 'others'
          ? 2
          : 0;

    return {
      north,
      south,
      west,
      east,
      zoom: zoom.value,
      clustered: MapStore.grouping,
      // The previous client-side clustering only combined markers with the
      // same dialect colours and the same visual source marker.
      mixDialects: false,
      mixSources: false,
      ownerScope,
      userId,
      createdFrom: MapStore.filter === 'new' ? oldCutoffDate : undefined,
      createdTo: MapStore.filter === 'old' ? oldCutoffDate : undefined,
      onlyMeaningfulDialects:
        MapStore.onlyDialects || MapStore.filter === 'any-dialect',
      hideOthersWithoutMeaningfulDialect: MapStore.hideOthersUnfinished,
      dialectMode: 0
    };
  }),
  150
);

const { data: mapData } = useQuery({
  queryKey: computed(() => ['recording-map-clusters', mapRequest.value]),
  queryFn: ({ signal }) => getRecordingMapClusters(mapRequest.value!, signal),
  enabled: computed(() => publicDataEnabled.value && mapRequest.value !== null),
  placeholderData: (previousData) => previousData,
  staleTime: 5 * 60 * 1000
});

function getIconDimensions(cluster = false) {
  const isMobile =
    typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  const baseSize = isMobile ? 20 : 16;
  const iconSize = cluster ? baseSize * 1.5 : baseSize;
  return {
    iconSize,
    iconAnchor: iconSize / 2
  };
}

function markerIcon(
  colors: string[],
  source: RecordingMapSource | 'mixed',
  cluster = false
): Icon {
  const { iconSize, iconAnchor } = getIconDimensions(cluster);
  return divIcon({
    className: cluster ? '' : 'recording-map-marker',
    iconSize: [iconSize, iconSize],
    iconAnchor: [iconAnchor, iconAnchor],
    html: `<multi-color-square style="display:block;width:${iconSize}px;height:${iconSize}px;aspect-ratio:1/1" size="${iconSize}px" dot="${source === 'ai'}" questionmark="${source === 'user'}" colors='${JSON.stringify(colors)}'></multi-color-square>`
  }) as Icon;
}

const hiddenConfirmedDialectCodes = new Set(['none', 'nobird', 'no-bird']);
const normalizeDialect = (dialect: string) =>
  dialect.toLowerCase().replace(/\s+/g, '');

function isVisibleFeature(feature: RecordingMapFeature): boolean {
  if (MapStore.filter === 'my' && !accountStore.user?.id) return false;

  return !(
    feature.source === 'confirmed' &&
    feature.dialects.some((dialect) =>
      hiddenConfirmedDialectCodes.has(normalizeDialect(dialect.dialectCode))
    )
  );
}

const markers = computed<Marker[]>(() =>
  (mapData.value?.features ?? [])
    .filter(isVisibleFeature)
    .map((feature): Marker => {
      const colors = feature.dialects.map((dialect) => dialect.color);

      if (feature.kind === 'cluster') {
        return {
          id: `cluster-${feature.id}`,
          icon: markerIcon(colors, feature.source, true),
          position: [feature.latitude, feature.longitude],
          data: {
            isRecordingCluster: true,
            cluster: feature,
            colors,
            fromModel: feature.source === 'ai',
            fromUser: feature.source === 'user',
            confirmed: feature.source === 'confirmed'
          }
        };
      }

      return {
        id: `${feature.recordingId}-${feature.locationPartId}`,
        icon: markerIcon(colors, feature.source),
        position: [feature.latitude, feature.longitude],
        data: {
          isRecording: true,
          recordingId: feature.recordingId,
          recordingPartId: feature.locationPartId,
          colors,
          fromModel: feature.source === 'ai',
          fromUser: feature.source === 'user',
          confirmed: feature.source === 'confirmed'
        }
      };
    })
    .sort((a, b) => Number(a.data?.confirmed) - Number(b.data?.confirmed))
);

const clusterItemsCache = new globalThis.Map<
  string,
  Promise<RecordingMapClusterItem[]>
>();

function getAllClusterItems(
  cluster: RecordingMapClusterFeature
): Promise<RecordingMapClusterItem[]> {
  const cacheKey = `${cluster.id}:${cluster.nextItemsCursor ?? ''}:${cluster.count}`;
  const cached = clusterItemsCache.get(cacheKey);
  if (cached) return cached;

  const request = (async () => {
    const items = [...(cluster.items ?? [])];
    let hasMoreItems = cluster.hasMoreItems;
    let cursor = cluster.nextItemsCursor;
    const seenCursors = new Set<string>();

    while (hasMoreItems && cursor && !seenCursors.has(cursor)) {
      seenCursors.add(cursor);
      const page = await getRecordingMapClusterItems(cluster.id, cursor);
      items.push(...(page.items ?? []));
      hasMoreItems = page.hasMoreItems;
      cursor = page.nextItemsCursor;
    }

    return items;
  })();

  clusterItemsCache.set(cacheKey, request);
  void request.catch(() => clusterItemsCache.delete(cacheKey));
  return request;
}

async function openClusterPopup(
  event: LeafletMouseEvent,
  marker: Marker,
  cluster: RecordingMapClusterFeature
) {
  const map = (event.target as L.Layer & { _map?: L.Map })._map;
  if (!map) return;

  const content = document.createElement('div');
  content.textContent = 'Načítání nahrávek…';
  const popup = L.popup()
    .setLatLng(marker.position)
    .setContent(content)
    .openOn(map);

  try {
    const items = await getAllClusterItems(cluster);
    content.replaceChildren();

    for (const item of items) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `Nahrávka ${item.recordingId}`;
      button.style.display = 'block';
      button.style.padding = '4px 0';
      button.addEventListener('click', () => {
        MapEvents.emit('click', {
          event,
          recordingId: item.recordingId,
          recordingPartId: item.locationPartId
        });
        map.closePopup(popup);
      });
      content.appendChild(button);
    }

    if (items.length === 0) content.textContent = 'Cluster je prázdný.';
    popup.update();
  } catch {
    content.textContent = 'Nahrávky v clusteru se nepodařilo načíst.';
    popup.update();
  }
}

// --- Grids ---
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
      const lon1 = lon;
      const lat1 = lat;
      const lon2 = lon + stepLon;
      const lat2 = lat + stepLat;
      if (
        lon2 <= fixed.minLon ||
        lon1 >= fixed.maxLon ||
        lat2 <= fixed.minLat ||
        lat1 >= fixed.maxLat
      ) {
        continue;
      }

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

const polygons = refDebounced(
  computed<Polygon[]>(() => [
    ...(zoom.value > 10 && zoom.value < 12 ? makeGrid(10 / 60, 6 / 60) : []),
    ...(zoom.value >= 12 && zoom.value < 14 ? makeGrid(5 / 60, 3 / 60) : [])
  ]),
  75
);

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

  if (marker?.data?.isRecordingCluster) {
    void openClusterPopup(event, marker, marker.data.cluster);
  } else if (marker) {
    MapEvents.emit('click', {
      event,
      recording: marker.data.recording,
      recordingPart: marker.data.part,
      recordingId: marker.data.recordingId ?? marker.data.recording?.id,
      recordingPartId: marker.data.recordingPartId ?? marker.data.part?.id
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
    }
  } else {
    MapEvents.emit('click', { event });
  }
};

const allMarkers = computed<Marker[]>(() => [
  ...markers.value,
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
    :mode="MapStore.aerial ? 'aerial' : 'outdoor'"
    :zoom-control="true"
    :use-glify="!props.selectionMode && MapStore.glify && !MapStore.grouping"
    :position="MapStore.center"
    @click="onClick"
  />
</template>
