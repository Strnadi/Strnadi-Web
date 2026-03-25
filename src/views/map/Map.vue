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
  /**
   * When true, render markers via WebGL (leaflet.glify) instead of DOM-based
   * MarkerClusterGroup. Dramatically improves performance for large datasets
   * (1 000+ points). Falls back to DOM markers for individual non-data markers
   * (e.g. the "selected-part-*" markers from the upload flow).
   */
  useGlify?: boolean;
}
</script>

<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount } from 'vue';
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

// Import glify — attaches L.glify to the leaflet namespace
import 'leaflet.glify';

const env = import.meta.env;
let leafletMap: LeafletMap | null = null;

// ─── Glify state ──────────────────────────────────────────────────────────────
//
// We use THREE separate glify point layers to reproduce the DOM marker visuals:
//
//   Layer 1 – Base circles: every data marker as a coloured filled circle.
//   Layer 2 – Dot overlay:  small BLACK circle on top of "fromModel" markers (●).
//   Layer 3 – Ring overlay: small WHITE circle on top of "fromUser" markers,
//             which punches a hole through the base colour ⇒ donut/ring (◎).
//
// Visual result:
//   Confirmed dialect  → solid coloured circle         ●
//   Predicted (model)  → coloured circle + black dot   ◉
//   User guess         → coloured circle + white hole  ◎  (ring)

let glifyBaseLayer: L.glify.PointsInstance | null = null;
let glifyDotLayer: L.glify.PointsInstance | null = null;
let glifyRingLayer: L.glify.PointsInstance | null = null;

/** Convert a hex colour string (#rrggbb) to the 0-1 RGB object glify expects. */
function hexToGlifyColor(hex: string): L.glify.GlifyColor {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(m[1]!, 16) / 255,
    g: parseInt(m[2]!, 16) / 255,
    b: parseInt(m[3]!, 16) / 255
  };
}

const GLIFY_BLACK: L.glify.GlifyColor = { r: 0, g: 0, b: 0 };
const GLIFY_WHITE: L.glify.GlifyColor = { r: 1, g: 1, b: 1 };

/** Pre-computed colour cache so glify's per-frame colour callback is O(1). */
let glifyColorCache: L.glify.GlifyColor[] = [];

// /** Zoom-responsive base point size. */
// function basePointSize(): number {
//   const z = leafletMap?.getZoom() ?? 8;
//   // Invert scaling: make points larger when zoomed *out* (smaller `z`),
//   // and smaller when zoomed in (larger `z`).
//   const maxZ = leafletMap?.getMaxZoom?.() ?? 19;
//   const t = maxZ - z;
//   // Keep a reasonable minimum so points remain clickable/visible.
//   return Math.max(6, Math.min(20, 1.8 * t - 5));
// }

/** Remove all three glify layers. */
function removeAllGlifyLayers() {
  if (glifyBaseLayer) { glifyBaseLayer.remove(); glifyBaseLayer = null; }
  if (glifyDotLayer)  { glifyDotLayer.remove();  glifyDotLayer = null; }
  if (glifyRingLayer) { glifyRingLayer.remove(); glifyRingLayer = null; }
}

/**
 * Rebuild the glify WebGL point layers from the current marker list.
 *
 * Because glify renders *all* points in a single WebGL draw call the cost of
 * thousands of markers drops from "hundreds of DOM nodes" to "one canvas".
 */
function rebuildGlifyPoints() {
  removeAllGlifyLayers();

  if (!leafletMap || !props.useGlify || !props.markers?.length) return;

  // Separate "data" markers (recordings) from "overlay" markers (e.g. selected-part-*)
  // Overlay markers are rendered as normal Leaflet markers so they keep their
  // custom icons. Data markers go through glify.
  const dataMarkers: Marker[] = [];
  const overlayMarkers: Marker[] = [];

  for (const m of props.markers) {
    if (m.data?.colors) {
      dataMarkers.push(m);
    } else {
      overlayMarkers.push(m);
    }
  }

  // Store overlay markers for the template to render via <l-marker>
  overlayMarkersForTemplate.value = overlayMarkers;

  if (!dataMarkers.length) return;

  // ── Build parallel arrays ───────────────────────────────────────────────────
  const allLatLngs: [number, number][] = new Array(dataMarkers.length);
  glifyColorCache = new Array(dataMarkers.length);

  // Subset arrays for the overlay layers
  const dotLatLngs: [number, number][] = [];
  const ringLatLngs: [number, number][] = [];

  for (let i = 0; i < dataMarkers.length; i++) {
    const m = dataMarkers[i]!;
    const pos: [number, number] = [m.position[0], m.position[1]];
    allLatLngs[i] = pos;

    const colors = (m.data?.colors ?? []) as string[];
    glifyColorCache[i] = hexToGlifyColor(colors[0] ?? '#000000');

    // Classify: model prediction → dot, user guess → ring
    if (m.data?.fromModel) {
      dotLatLngs.push(pos);
    } else if (m.data?.fromUser) {
      ringLatLngs.push(pos);
    }
  }

  // Store the data markers array so click handler can resolve the index
  glifyDataMarkers = dataMarkers;

  // Click handler shared by all layers.
  // We use a coordinate->index lookup so it works even when the clicked point
  // comes from a subset layer (dot/ring overlays).
  const posKey = (p: [number, number]) => `${p[0]},${p[1]}`;
  const posToIndex = new Map<string, number>();
  for (let i = 0; i < allLatLngs.length; i++) {
    const pos = allLatLngs[i]!;
    posToIndex.set(posKey(pos), i);
  }

  const handleClick = (
    e: L.LeafletMouseEvent,
    feature: [number, number],
    _xy: { x: number; y: number }
  ) => {
    const idx = posToIndex.get(posKey(feature));
    const marker = idx !== undefined ? glifyDataMarkers[idx] : undefined;
    if (marker) {
      emit('click', { event: e, marker });
    }
  };

  // ── Layer 1: base coloured circles ──────────────────────────────────────────
  glifyBaseLayer = L.glify.points({
    map: leafletMap,
    data: allLatLngs,
    size: () => 10,
    color: (index: number) => glifyColorCache[index] ?? GLIFY_BLACK,
    opacity: 0.88,
    // Reduce hit radius: prevents clicks slightly away from a point
    // incorrectly resolving to the nearest marker.
    sensitivity: 1,
    click: handleClick,
    pane: 'overlayPane'
  });

  // ── Layer 2: black dot overlay (predicted / fromModel) ──────────────────────
  if (dotLatLngs.length > 0) {
    glifyDotLayer = L.glify.points({
      map: leafletMap,
      data: dotLatLngs,
      // Inner dot is ~35% of the base size
      size: () => Math.max(6, 10 * 0.35),
      color: () => GLIFY_BLACK,
      opacity: 0.95,
      sensitivity: 1,
      click: handleClick,
      pane: 'overlayPane'
    });
  }

  // ── Layer 3: white ring overlay (user guess / fromUser) ─────────────────────
  // A white circle at ~55% of the base size "punches out" the centre,
  // leaving a coloured ring around the outside — the ◎ donut effect.
  if (ringLatLngs.length > 0) {
    glifyRingLayer = L.glify.points({
      map: leafletMap,
      data: ringLatLngs,
      size: () => Math.max(6, 10 * 0.55),
      color: () => GLIFY_WHITE,
      opacity: 1.0,
      sensitivity: 1,
      click: handleClick,
      pane: 'overlayPane'
    });
  }
}

/** Data markers currently rendered by glify (kept for click resolution). */
let glifyDataMarkers: Marker[] = [];

/** Overlay markers that are NOT handled by glify and need normal Leaflet rendering. */
const overlayMarkersForTemplate = ref<Marker[]>([]);

// ─── Clustering state (used when useGlify === false) ──────────────────────────
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
          const fromModel = om?.data?.fromModel as boolean;
          const fromUser = om?.data?.fromUser as boolean;
          const html = `<multi-color-square size="100%" colors='${JSON.stringify(
            colors
          )}' dot="${Boolean(fromModel)}" questionmark="${Boolean(fromUser)}"></multi-color-square>`;

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
  markers: () => [] as Marker[],
  useGlify: false
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

  if (props.useGlify) {
    rebuildGlifyPoints();
  } else {
    rebuildClusters();
  }
}

watch([zoom, center], updateBounds);

// ─── Reactivity: rebuild rendering when markers or mode changes ───────────────
watch(
  () => [props.markers, props.clusterTest, props.allowedClustering, props.useGlify],
  () => {
    if (props.useGlify) {
      // Tear down any leftover cluster groups when switching to glify
      if (clusterGroups.length) {
        clusterGroups.forEach((cg) => leafletMap?.removeLayer(cg.group));
        clusterGroups = [];
      }
      rebuildGlifyPoints();
    } else {
      // Tear down glify when switching to clusters
      removeAllGlifyLayers();
      overlayMarkersForTemplate.value = [];
      rebuildClusters();
    }
  },
  { deep: true }
);

// Redraw glify on zoom changes so point sizes update across all layers
watch(zoom, () => {
  if (props.useGlify) {
    glifyBaseLayer?.render();
    glifyDotLayer?.render();
    glifyRingLayer?.render();
  }
});

// ─── Cleanup ──────────────────────────────────────────────────────────────────
onBeforeUnmount(() => {
  removeAllGlifyLayers();
  clusterGroups.forEach((cg) => {
    if (leafletMap) leafletMap.removeLayer(cg.group);
  });
  clusterGroups = [];
});
</script>

<template>
  <div class="flex flex-1 saturate-[1.2]">
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
        :color="hoveredPolygon === polygon.id ? '#000000' : polygon.color"
        :weight="hoveredPolygon === polygon.id ? polygon.weight * 2 : polygon.weight"
        :lat-lngs="polygon.position"
        :fill-opacity="hoveredPolygon === polygon.id ? 0.05 : 0"
        :bubbling-mouse-events="false"
        @mouseover="hoveredPolygon = polygon.id"
        @mouseleave="hoveredPolygon = null"
        @click="(event: LeafletMouseEvent) => emit('click', { event, polygon })"
      />

      <!--
        When NOT using glify, individual markers are handled via
        MarkerClusterGroup programmatically (see rebuildClusters).

        When using glify, only "overlay" markers (e.g. location pins
        from the upload flow) are rendered as normal Leaflet markers.
        Data markers are drawn by the WebGL layer.
      -->
      <l-marker
        v-for="m in overlayMarkersForTemplate"
        :key="m.id"
        :lat-lng="m.position"
        :icon="m.icon"
        @click="(event: LeafletMouseEvent) => emit('click', { event, marker: m })"
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