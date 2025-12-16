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
  /**
   * Optional callback that determines whether 2 markers are considered compatible for clustering.
   * If omitted, all markers can be clustered together.
   */
  clusterTest?: (a: Marker, b: Marker) => boolean;
  allowedClustering?: [Marker, Marker][];
}
</script>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useGeolocation } from '@vueuse/core';
import { type Map as LeafletMap, type LeafletMouseEvent, Icon } from 'leaflet';

import {
  LMap,
  LTileLayer,
  LPolygon,
  LControlScale,
  LControl,
  LControlZoom,
  LMarker
} from '@vue-leaflet/vue-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import type { MarkerClusterGroup, MarkerCluster } from 'leaflet';

const env = process.env;
let leafletMap: LeafletMap | null = null;

// --- Clustering ---
// Keep references so we can remove / update clusters when props change
let clusterGroups: { group: MarkerClusterGroup; sample: Marker }[] = [];

/** Create or update cluster groups according to current markers & clusterTest. */
function rebuildClusters() {
  if (!leafletMap) return;

  // Remove previous groups from map
  clusterGroups.forEach((cg) => leafletMap!.removeLayer(cg.group));
  clusterGroups = [];

  if (!props.markers || props.markers.length === 0) return;

  // Helper to create leaflet marker with reference
  const createLeafletMarker = (m: Marker) => {
    const lm = L.marker(m.position as L.LatLngExpression, { icon: m.icon });
    // @ts-ignore custom data
    lm.__original = m;
    lm.on('click', (ev) => {
      emit('click', { event: ev as unknown as LeafletMouseEvent, marker: m });
    });
    return lm;
  };

  props.markers.forEach((m) => {
    // find existing compatible group
    let targetGroupObj: (typeof clusterGroups)[number] | undefined;

    if (props.allowedClustering) {
      targetGroupObj = clusterGroups.find((cg) =>
        props.allowedClustering!.some(
          (pair) =>
            (pair[0] === m && pair[1] === cg.sample) ||
            (pair[1] === m && pair[0] === cg.sample)
        )
      );
    } else if (props.clusterTest) {
      targetGroupObj = clusterGroups.find((cg) =>
        props.clusterTest!(m, cg.sample)
      );
    } else {
      targetGroupObj = clusterGroups[0];
    }

    if (!targetGroupObj) {
      // create new cluster group
      const newGroup = (L as any).markerClusterGroup({
        showCoverageOnHover: false,
        iconCreateFunction: (cluster: MarkerCluster) => {
          const child = cluster.getAllChildMarkers()[0] as any;
          const om: Marker | undefined = child?.__original;
          const colors = (om?.data?.colors ?? []) as string[];
          const html = `<multi-color-square size="100%" colors='${JSON.stringify(
            colors
          )}'></multi-color-square>`;

          const isMobile = window.innerWidth < 768;
          const iconSize = (isMobile ? 20 : 12) * 1.5;

          return L.divIcon({
            html,
            className: '',
            iconSize: [iconSize, iconSize],
            iconAnchor: [iconSize / 2, iconSize / 2]
          });
        }
      }) as MarkerClusterGroup;
      newGroup.on('clusterclick', onClusterClick);
      leafletMap?.addLayer(newGroup);
      targetGroupObj = { group: newGroup, sample: m };
      clusterGroups.push(targetGroupObj);
    }

    const leafletMarker = createLeafletMarker(m);
    targetGroupObj.group.addLayer(leafletMarker);
  });
}

function onClusterClick(e: any) {
  if (!leafletMap) return;
  const cluster: MarkerCluster = e.layer;
  const childMarkers = cluster.getAllChildMarkers();

  // Build popup with selectable list
  const htmlItems = childMarkers
    .map((cm: any, idx: number) => {
      const om: Marker = cm.__original;
      const label = om.data?.recording?.id ?? om.id ?? `Point ${idx + 1}`;
      return `<div style="cursor:pointer;padding:4px 0;" data-idx="${idx}">${label}</div>`;
    })
    .join('');

  const popup = L.popup()
    .setLatLng(cluster.getLatLng())
    .setContent(`<div>${htmlItems}</div>`)
    .openOn(leafletMap);

  // Add click delegate
  setTimeout(() => {
    const container = popup.getElement();
    if (!container) return;
    container.addEventListener('click', (event: any) => {
      const target = event.target as HTMLElement;
      const idxAttr = target.getAttribute('data-idx');
      if (idxAttr != null) {
        const idx = parseInt(idxAttr, 10);
        const cm: any = childMarkers[idx];
        const om: Marker = cm.__original;
        emit('click', { event: e, marker: om });
        leafletMap!.closePopup(popup);
      }
    });
  }, 0);
}

const hoveredPolygon = ref<(number | string) | null>(null);

const { coords, isSupported: isGeolocationSupported } = useGeolocation();
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

function onMapReady(mapComp: any) {
  leafletMap = mapComp.mapObject ?? mapComp;
  updateBounds();

  // Build the initial cluster groups
  rebuildClusters();
}

watch([zoom, center], updateBounds);

// Rebuild clusters whenever markers or clusterTest changes or when map ready
watch(
  () => [props.markers, props.clusterTest, props.allowedClustering],
  () => {
    rebuildClusters();
  },
  { deep: true }
);
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
      <!--      <l-tile-layer-->
      <!--        url="/map-loading.png"-->
      <!--        :z-index="0"-->
      <!--      />-->
      <l-tile-layer
        :url="`${env.PUBLIC_API_URL}/map/v1/maptiles/${mode}/${mode !== 'aerial' ? '256@2x' : '256'}/{z}/{x}/{y}`"
        :max-zoom="19"
        :min-zoom="5"
        :z-index="1"
        attribution="<a href='https://api.mapy.cz/copyright' target='_blank'>&copy; Seznam.cz a.s. a další</a>"
      />
      <l-tile-layer
        v-if="mode === 'aerial'"
        :url="`${env.PUBLIC_API_URL}/map/v1/maptiles/names-overlay/256/{z}/{x}/{y}`"
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
        :bubbling-mouse-events="false"
        @mouseover="hoveredPolygon = polygon.id"
        @mouseleave="hoveredPolygon = null"
        @click="(event: LeafletMouseEvent) => emit('click', { event, polygon })"
      />

      <!-- Individual markers are handled via MarkerClusterGroup programmatically -->

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
            />
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
