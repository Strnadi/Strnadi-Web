<script lang="ts">
export interface Polygon {
  id: number | string;
  color: string;
  weight: number;
  position: [number, number][];
  data?: any;
}

export interface Marker {
  id: number | string;
  icon: Icon;
  position: [number, number];
  data?: any;
}

export interface MapProps {
  polygons?: Polygon[];
  markers?: Marker[];
  mode?: 'outdoor' | 'basic' | 'aerial';
  scaleBar?: boolean;
  zoomControl?: boolean;
  position: [lat: number, lon: number, alt: number];
}
</script>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useGeolocation } from '@vueuse/core';
import { type Map as LeafletMap, type LeafletMouseEvent, Icon } from 'leaflet';
import * as L from 'leaflet';

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
// @ts-ignore: leaflet.markercluster plugin
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

const env = import.meta.env;
let leafletMap: LeafletMap | null = null;

const hoveredPolygon = ref<(number | string) | null>(null);
const hoveredMarker = ref<(number | string) | null>(null);

const { coords, isSupported: isGeolocationSupported } = useGeolocation();
const markerClusterGroup = ref<any>(null);
const iconCurrent = new Icon({
  iconUrl: '/dialects/current-location.svg',
  iconSize: [24, 24],
  iconAnchor: [19, 19]
});
const iconCurrentHeading = new Icon({
  iconUrl: '/dialects/current-location.svg',
  iconSize: [24, 24],
  iconAnchor: [19, 19]
});

const props = withDefaults(defineProps<MapProps>(), {
  mode: 'outdoor',
  zoomControl: false,
  polygons: () => [] as Polygon[],
  markers: () => [] as Marker[]
});

const zoom = ref<number>(props.position[2]);
const center = ref<[number, number]>([props.position[0], props.position[1]]);

const emit = defineEmits<{
  click: [
    payload: { event: LeafletMouseEvent; polygon?: Polygon; marker?: Marker }
  ];
  'update:bounds': [
    bounds: [north: number, south: number, west: number, east: number]
  ];
  'update:zoom': [newZoom: number];
}>();

watch(
  () => props.position,
  ([newLat, newLon, newZoom]) => {
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

// Add markers to cluster group
function addClusterMarkers() {
  if (!leafletMap || !markerClusterGroup.value) return;
  markerClusterGroup.value.clearLayers();
  props.markers.forEach((marker) => {
    const m = L.marker(marker.position, { icon: marker.icon });
    (m as any).markerData = marker;
    m.on('click', (e) => emit('click', { event: e, marker }));
    m.on('mouseover', () => (hoveredMarker.value = marker.id));
    m.on('mouseout', () => (hoveredMarker.value = null));
    markerClusterGroup.value.addLayer(m);
  });
}

function onMapReady(mapComp: any) {
  leafletMap = mapComp.mapObject ?? mapComp;
  // initialize marker clustering
  // initialize marker clustering with spiderfy on click
  markerClusterGroup.value = (L as any).markerClusterGroup({ zoomToBoundsOnClick: false, spiderfyOnClick: true });
  leafletMap!.addLayer(markerClusterGroup.value);
  // Add initial markers
  addClusterMarkers();
  // Handle cluster clicks: show picker with individual markers
  markerClusterGroup.value.on('clusterclick', (e: any) => {
    const clusterMarkers = e.layer.getAllChildMarkers();
    const listItems = clusterMarkers.map((m: any, idx: number) =>
      `<li data-idx="${idx}" style="cursor:pointer;padding:4px;">${(m as any).markerData.id}</li>`
    ).join('');
    const popup = L.popup({ closeOnClick: true, autoClose: true })
      .setLatLng(e.latlng)
      .setContent(`<ul class=\"cluster-picker\">${listItems}</ul>`)
      .openOn(leafletMap!);
    setTimeout(() => {
      document.querySelectorAll('.cluster-picker li').forEach(item =>
        item.addEventListener('click', () => {
          const idx = Number(item.getAttribute('data-idx'));
          const m = clusterMarkers[idx];
          const marker = (m as any).markerData;
          emit('click', { event: { latlng: m.getLatLng() } as any, marker });
          leafletMap!.closePopup();
        })
      );
    }, 0);
  });
  updateBounds();
}

watch([zoom, center], updateBounds);
// update cluster markers when props.markers change
watch(
  () => props.markers,
  (newMarkers) => {
    if (!leafletMap || !markerClusterGroup.value) return;
    markerClusterGroup.value.clearLayers();
    newMarkers.forEach((marker) => {
      const m = L.marker(marker.position, { icon: marker.icon });
      m.on('click', (e) => emit('click', { event: e, marker }));
      m.on('mouseover', () => (hoveredMarker.value = marker.id));
      m.on('mouseout', () => (hoveredMarker.value = null));
      markerClusterGroup.value.addLayer(m);
    });
  },
  { immediate: true, deep: true }
);
</script>

<template>
  <div class="flex flex-1 saturate-[1.2]">
    <!-- The map will not read external variables for zoom and center -->
    <!-- These reactive variable changes will be catched in the store translated into flyTo calls  -->
    <l-map
      v-model:center="center"
      class="w-full h-full"
      :zoom="zoom"
      :options="{ zoomControl: false }"
      @ready="onMapReady"
      @moveend="updateBounds"
      @click="(event: LeafletMouseEvent) => emit('click', { event })"
      @update:zoom="updateZoom"
    >
      <!-- Tile Layers -->
      <!--      <l-tile-layer-->
      <!--        url="/map-loading.png"-->
      <!--        :z-index="0"-->
      <!--      />-->
      <l-tile-layer
        :url="`${env.VITE_API_URL}/map/v1/maptiles/${mode}/${mode !== 'aerial' ? '256@2x' : '256'}/{z}/{x}/{y}`"
        :max-zoom="19"
        :min-zoom="5"
        :z-index="1"
        attribution="<a href='https://api.mapy.cz/copyright' target='_blank'>&copy; Seznam.cz a.s. a další</a>"
      />
      <l-tile-layer
        v-if="mode === 'aerial'"
        :url="`${env.VITE_API_URL}/map/v1/maptiles/names-overlay/256/{z}/{x}/{y}`"
        :max-zoom="19"
        :min-zoom="5"
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
          <a href="http://mapy.cz/" target="_blank">
            <img
              src="https://api.mapy.cz/img/api/logo.svg"
              alt="Mapy.cz Logo"
            />
          </a>
        </div>
      </l-control>

      <!-- Controls -->
      <l-control-scale v-if="scaleBar" :imperial="false" />

      <l-control-zoom v-if="zoomControl" position="bottomleft" />
    </l-map>
  </div>
</template>
