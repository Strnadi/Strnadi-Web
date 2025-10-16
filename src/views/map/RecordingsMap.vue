<script lang="ts">
import mitt from '@/vendor/mitt';
import { reactive } from 'vue';
import { type LeafletMouseEvent } from 'leaflet';
import type { Polygon, Marker } from '@/views/map/Map.vue';
import { refDebounced } from '@vueuse/core';

// let positionStack = ref([
//   [ 49.9, 15.5, 8.25 ]
// ]);
// const currentCenter = computed<[number, number, number]>(() => positionStack.value[positionStack.value.length - 1] as [number, number, number]);

const currentCenter = ref<[number, number, number]>([ 49.9, 15.5, 8.25 ]);

export type MapFilter = 'all' | 'new' | 'old' | 'my' | 'others' | 'any-dialect';
export interface MapClickEvent {
  event: LeafletMouseEvent;
  recording?: RecordingModel;
  recordingPart?: RecordingPartModel;
  square?: string;
};

export const DialectColors = {
  'BC': '#FDE441',
  'BE': '#52DC4D',
  'BD': '#666666',
  'BhBl': '#8ED0FF',
  'BlBh': '#4E68F0',
  'XB': '#F04D4D',
  'XsB': '#AC0000',
  'XlB': '#EA0000',
  'Bez dialektu': '#000000',
};


export const MapEvents = mitt<{
  'click': MapClickEvent
}>();

export const MapStore = reactive<{
  markers: Record<string, Marker>,
  scale: boolean;
  aerial: boolean;
  filter: MapFilter;
  unmove(): void;
  move(newCenter: [number, number], newZoom?: number, override?: boolean): void;
}>({
  scale: false,
  aerial: false,
  filter: 'new',
  markers: {},

  move(newCenter: [number, number], newZoom?: number, override = false) {

    // if(!override) {
    //   positionStack.value.push([...newCenter, newZoom]);
    // } else {
    //   positionStack.value[positionStack.value.length - 1] = [...newCenter, newZoom];
    // }

    currentCenter.value = [...newCenter, newZoom ?? currentCenter.value[2]];
  },

  unmove() {

    // positionStack.value.pop();

  },
});

</script>


<script setup lang="ts">
import { ref, computed } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { getRecordings, getFilteredRecordings } from '@/api/recordings';

import { accountStore } from '@/state/AccountStore';

import Map from '@/views/map/Map.vue';
import { type FilteredPartModel, type RecordingModel, type RecordingPartModel } from '@/api/recordings';
import { divIcon, type Icon } from 'leaflet';

const { data: recordings } = useQuery({
  queryKey: ['all-recordings'],
  queryFn: () => getRecordings({ parts: true })
});

const { data: filteredRecordings } = useQuery({
  queryKey: ['filtered-parts'],
  queryFn: () => getFilteredRecordings()
});

// --- Grids ---
const fixed = { minLon: 12, maxLon: 19.5, minLat: 48.5, maxLat: 51.5 };
const viewBounds = ref<[north: number, south: number, west: number, east: number] | null>(null);

function makeGrid(stepLon: number, stepLat: number): Polygon[] {
  if (!viewBounds.value) return [];
  const [maxLatView, minLatView, minLonView, maxLonView] = viewBounds.value;
  const bufLon = stepLon * 1.5;
  const bufLat = stepLat * 1.5;
  const minLon = Math.max(fixed.minLon, minLonView - bufLon);
  const maxLon = Math.min(fixed.maxLon, maxLonView + bufLon);
  const minLat = Math.max(fixed.minLat, minLatView - bufLat);
  const maxLat = Math.min(fixed.maxLat, maxLatView + bufLat);
  const startLon = fixed.minLon + Math.floor((minLon - fixed.minLon) / stepLon) * stepLon;
  const startLat = fixed.minLat + Math.floor((minLat - fixed.minLat) / stepLat) * stepLat;
  const polys: Polygon[] = [];
  for (let lon = startLon; lon < maxLon; lon += stepLon) {
    for (let lat = startLat; lat < maxLat; lat += stepLat) {
      const lon1 = lon, lat1 = lat;
      const lon2 = lon + stepLon, lat2 = lat + stepLat;
      if (lon2 <= fixed.minLon || lon1 >= fixed.maxLon || lat2 <= fixed.minLat || lat1 >= fixed.maxLat) continue;
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
        color: "rgba(0,0,0,0.3)",
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
  ...((zoom.value > 10 && zoom.value < 12) ? makeGrid(10/60, 6/60) : []),
  ...((zoom.value >= 12 && zoom.value < 14) ? makeGrid(5/60, 3/60) : []),
  ...((zoom.value >= 14) ? makeGrid(2.5/60, 1.5/60) : [])
]), 2500);

const oldCutoff = new Date(2024, 11, 31);
const markers = computed<Marker[]>(() => {

  return recordings.value
    ?.filter(r => {
      switch (MapStore.filter) {
        case 'my': return r.userId === accountStore.user?.id;
        case 'others': return r.userId !== accountStore.user?.id;
        case 'old': return new Date(r.createdAt) <= oldCutoff;
        case 'new': return new Date(r.createdAt) > oldCutoff;
        case 'any-dialect': {
          return filteredRecordings.value?.some(
            fp => fp.recordingId === r.id && fp.detectedDialects !== null
          ) ?? false;
        }
        default: return true;
      }
    })
    .flatMap(r =>
      (r.parts ?? []).map((p: RecordingPartModel) => ({
        rec: r,
        part: p,
        // pick any filtered‑part whose time window overlaps this part
        filteredParts: filteredRecordings.value
          ?.filter((fr: FilteredPartModel) => {
            const afterStart = new Date(fr.startDate) >= new Date(p.startDate);
            const beforeEnd = new Date(fr.endDate) <= new Date(p.endDate);

            return (fr.recordingId === r.id) && afterStart && beforeEnd;
          })
      }))
    )
    .map(({ rec, part, filteredParts }) => {
      const dialectStrings = filteredParts?.flatMap(
        fp => fp.detectedDialects?.map(
          dd => {
            let color: string | undefined = undefined;
            // Check if the dialect string exists and is a key in DialectColors
            if (dd.confirmedDialect && dd.confirmedDialect in DialectColors) {
              color = DialectColors[dd.confirmedDialect as keyof typeof DialectColors];
            } else if (dd.userGuessDialect && dd.userGuessDialect in DialectColors) {
              color = DialectColors[dd.userGuessDialect as keyof typeof DialectColors];
            }
            return color ?? null; // Return null if no color found, to be filtered later
          }
        ) ?? []
      ) ?? [];
      const colors = dialectStrings.filter(c => c !== null); // Filter out nulls
      const finalColors = colors.length > 0 ? colors : ['#000000'];

      const icon = divIcon({
        className: '',
        iconSize: [12, 12],
        iconAnchor: [6, 6],
        html: `<multi-color-square size="100%" colors='${JSON.stringify(finalColors)}' gradient="true"></multi-color-square>`
      });

      return {
        id: `${rec.id}-${part.id}`,
        icon: icon as Icon,
        position: [part.gpsLatitudeStart, part.gpsLongitudeStart],
        data: {
          recording: rec,
          part: part
        }
      }
    }) ?? [];
});

const onClick = ({ event, polygon, marker }: { event: LeafletMouseEvent; polygon?: Polygon; marker?: Marker }) => {
  event.originalEvent.stopPropagation();

  if(marker) {
    MapEvents.emit('click', { event, recording: marker.data.recording, recordingPart: marker.data.part });
  } else if(polygon) {
    if (!polygon.position) return;

    const p0 = polygon.position[0];
    const p2 = polygon.position[2];

    if (p0 && p2) {
      const lat = ((p0[0] ?? 0) + (p2[0] ?? 0)) / 2;
      const lng = ((p0[1] ?? 0) + (p2[1] ?? 0)) / 2;

      const y = Math.floor(560 - lat*10);
      const x = Math.floor(lng*6 - 34);
      MapEvents.emit('click', { event, square: `${y}${x}` });
    } else {
      // Handle cases where polygon.position might be too short, though makeGrid should prevent this.
      console.warn('Polygon clicked with unexpected structure:', polygon);
      return;
    }
  } else {
    MapEvents.emit('click', { event });
  }
}

</script>

<template>
  <Map
    v-model:bounds="viewBounds"
    v-model:zoom="zoom"
    :scale-bar="MapStore.scale"
    :polygons="polygons"
    :markers="[...markers, ...Object.values(MapStore.markers)]"
    :mode="MapStore.aerial ? 'aerial' : 'outdoor'"
    :position="currentCenter"
    :zoom-control="true"
    @click="onClick"
  />
</template>
