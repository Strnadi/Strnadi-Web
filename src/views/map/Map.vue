<script lang="ts">

export interface Polygon {
  id: number | string;
  color: string;
  weight: number;
  position: [number, number][];
  data?: any;
};

export interface Marker {
  id: number | string;
  icon: Icon;
  position: [number, number];
  data?: any;
};

export interface MapProps {
  polygons?: Polygon[];
  markers?: Marker[];
  mode?: "outdoor" | "basic" | "aerial";
  scaleBar?: boolean;
  zoomControl?: boolean;
  position: [lat: number, lon: number, alt: number];
}

</script>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useGeolocation } from '@vueuse/core';
import { type Map as LeafletMap, type LeafletMouseEvent, Icon } from 'leaflet';

import {
  LMap,
  LTileLayer,
  LMarker,
  LPolygon,
  LControlScale,
  LControl,
  LControlZoom
} from '@vue-leaflet/vue-leaflet';
import 'leaflet/dist/leaflet.css';

const env = import.meta.env;
let leafletMap: (LeafletMap | null) = null;

const hoveredPolygon = ref<(number | string) | null>(null);
const hoveredMarker = ref<(number | string) | null>(null);

const { coords, isSupported: isGeolocationSupported } = useGeolocation();
const iconCurrent = new Icon({ iconUrl: '/dialects/current-location.svg', iconSize: [24, 24], iconAnchor: [19, 19] });
const iconCurrentHeading = new Icon({ iconUrl: '/dialects/current-location.svg', iconSize: [24, 24], iconAnchor: [19, 19] });

const props = withDefaults(
  defineProps<MapProps>(),
  {
    mode: 'outdoor',
    zoomControl: false,
    polygons: () => [] as Polygon[],
    markers: () => [] as Marker[]
  }
);

const zoom = ref<number>(props.position[2]);
const center = ref<[number, number]>([ props.position[0], props.position[1] ]);

const emit = defineEmits<{
  'click': [payload: { event: LeafletMouseEvent; polygon?: Polygon; marker?: Marker }];
  'update:bounds': [bounds: [north: number, south: number, west: number, east: number]];
  'update:zoom': [newZoom: number];
}>();

watch(
  () => props.position,
  ([ newLat, newLon, newZoom ]) => {
    if (!leafletMap) return;

    // leafletMap.flyTo([ newLat, newLon ], newZoom, {
    //   animate: true,
    //   duration: 0.5
    // })

    center.value = [newLat, newLon];
    zoom.value = newZoom;
  }
);

function updateBounds() {
  if (!leafletMap) return;

  const b = leafletMap.getBounds();
  emit('update:bounds', [b.getNorth(), b.getSouth(), b.getWest(), b.getEast()]);
}

function updateZoom(newZoom: number) {
  zoom.value = newZoom;
  emit('update:zoom', newZoom);
}

function onMapReady(mapComp: any) {
  leafletMap = mapComp.mapObject ?? mapComp;
  updateBounds();
}

watch([zoom, center], updateBounds);

</script>

<template>
  <div class="flex flex-1 saturate-[1.2]">
    <!-- The map will not read external variables for zoom and center -->
    <!-- These reactive variable changes will be catched in the store translated into flyTo calls  -->
    <l-map
      v-model:center="center"
      class="flex-1"
      :zoom="zoom"
      :options="{ zoomControl: false }"
      @ready="onMapReady"
      @moveend="updateBounds"
      @click="(event: LeafletMouseEvent) => emit('click', { event })"
      @update:zoom="updateZoom"
    >
      <!-- Tile Layers -->
      <l-tile-layer
        url="/map-loading.png"
        :z-index="0"
      />
      <l-tile-layer
        :url="`${env.VITE_API_URL}/map/v1/maptiles/${mode}/${mode!=='aerial'? '256@2x':'256'}/{z}/{x}/{y}`"
        :max-zoom="19"
        :z-index="1"
        attribution="<a href='https://api.mapy.cz/copyright' target='_blank'>&copy; Seznam.cz a.s. a další</a>"
      />
      <l-tile-layer
        v-if="mode==='aerial'"
        :url="`${env.VITE_API_URL}/map/v1/maptiles/names-overlay/256/{z}/{x}/{y}`"
        :max-zoom="19"
        :z-index="2"
        attribution="<a href='https://api.mapy.cz/copyright' target='_blank'>&copy; Seznam.cz a.s. a další</a>"
      />

      <!-- Polygons -->
      <l-polygon
        v-for="polygon in polygons"
        :key="polygon.id"
        :color="polygon.color"
        :weight="polygon.weight"
        :lat-lngs="polygon.position"
        :fill-opacity="hoveredPolygon === polygon.id ? 0.1 : 0"
        @mouseover="hoveredPolygon = polygon.id"
        @mouseleave="hoveredPolygon = null"
        @click="(event: LeafletMouseEvent) => emit('click', { event, polygon })"
      />

      <!-- Markers -->
      <l-marker
        v-for="marker in markers"
        :key="marker.id"
        :icon="marker.icon"
        :lat-lng="marker.position"
        @click="(event: LeafletMouseEvent) => emit('click', { event, marker })"
        @mouseover="hoveredMarker = marker.id"
        @mouseout="hoveredMarker = null"
      />

      <!-- Current Location -->
      <l-marker
        v-if="isGeolocationSupported"
        :lat-lng="[coords.latitude, coords.longitude]"
        :rotation-angle="coords.heading || 0"
        :icon="coords.heading ? iconCurrentHeading : iconCurrent"
      />

      <!-- Mapy.cz Logo -->
      <l-control position="bottomleft">
        <div class="z-[40]">
          <a
            href="http://mapy.cz/"
            target="_blank"
          >
            <img
              src="https://api.mapy.cz/img/api/logo.svg"
              alt="Mapy.cz Logo"
            >
          </a>
        </div>
      </l-control>

      <!-- Controls -->
      <l-control-scale
        v-if="scaleBar"
        :imperial="false"
      />

      <l-control-zoom
        v-if="zoomControl"
        position="bottomleft"
      />

    </l-map>
  </div>
</template>
