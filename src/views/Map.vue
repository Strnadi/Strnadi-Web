<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { mapStore } from '@/state/MapStore';
import { accountStore } from '@/state/AccountStore';
import { useQuery } from '@tanstack/vue-query';
import { getFilteredRecordings, getRecordings } from '@/api/recordings';
import type { RecordingModel, RecordingPartModel } from '@/api/types/recording';
import { useGeolocation } from '@vueuse/core';
import { MapIcons } from '../constants/MapIcons';
import LocationSearch from '@/components/map/LocationSearch.vue';
import InfoIcon from '@/icons/interface/icon-info.svg';
import ListIcon from '@/icons/interface/icon-list.svg';
import MapIcon from '@/icons/interface/icon-map.svg';
import RulerIcon from '@/icons/interface/icon-ruler.svg';
import FilledRulerIcon from '@/icons/interface/icon-ruler-fill.svg';
import PictureIcon from '@/icons/interface/icon-picture.svg';

// @ts-expect-error
import FilterIcon from '@/icons/interface/icon-filter2.svg?url';

import {
  LMap,
  LTileLayer,
  LMarker,
  LPolygon,
  LControlScale,
  LControl
} from '@vue-leaflet/vue-leaflet';
import 'leaflet/dist/leaflet.css';
import { icon, Icon, type LatLngExpression, LeafletMouseEvent } from 'leaflet';

const env = import.meta.env;

// -- Map state --
const router = useRouter();
const toolsShown = ref(false);
const zoom = ref(8.25);
const center = ref<LatLngExpression>({ lat: 49.9, lng: 15.5 });
const scaleEnabled = ref(true);
let leafletMap: any = null;

const searchText = ref("");

// Geolocation
const { coords } = useGeolocation();
const currentMapCoords = computed(() =>
  coords.value
    ? [coords.value.latitude, coords.value.longitude] as [number, number]
    : null
);

// Recordings query
const { data: recordings } = useQuery({ queryKey: ['all-recordings'], queryFn: () => getRecordings() });

const { data: filteredRecordings, isFetched } = useQuery({ queryKey: ['filtered-parts'], queryFn: () => getFilteredRecordings() });

const availableMapModes = computed(() => ({
  'all': "Všechny nahrávky",
  'new': "Jen nové nahrávky",
  'old': "Jen staré nahrávky",
  'dialect': "Jen nahrávky s dialektem",
  ...(accountStore.user && {
    'my': "Jen moje nahrávky",
    'others': "Jen nahrávky ostatních"
  })
}));

// Filter
const filter = ref<keyof typeof availableMapModes.value>('new');
const oldCutoff = new Date(2024, 11, 31);
function recordingsFilter(data: RecordingModel[] = []): RecordingModel[] {
  return data.filter(r => {
    switch (filter.value) {
      case 'my': return r.userId === accountStore.user?.id;
      case 'others': return r.userId !== accountStore.user?.id;
      case 'old': return new Date(r.createdAt) <= oldCutoff;
      case 'new': return new Date(r.createdAt) > oldCutoff;
      default: return true;
    }
  });
}

// Bounds and grid extent
const viewBounds = ref<[number, number, number, number] | null>(null);
const fixed = reactive({ minLon: 12, maxLon: 19.5, minLat: 48.5, maxLat: 51.5 });

function updateBounds() {
  if (!leafletMap) return;
  const b = leafletMap.getBounds();
  viewBounds.value = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
}

const mapRef = ref<any>(null);

// watch zoom/center all the time
watch([zoom, center], updateBounds);

// Generate KFME grid polygons
function makeGrid(stepLon: number, stepLat: number) {
  if (!viewBounds.value) return [];
  const [minLonView, minLatView, maxLonView, maxLatView] = viewBounds.value;
  const bufLon = stepLon * 1.5;
  const bufLat = stepLat * 1.5;
  const minLon = Math.max(fixed.minLon, minLonView - bufLon);
  const maxLon = Math.min(fixed.maxLon, maxLonView + bufLon);
  const minLat = Math.max(fixed.minLat, minLatView - bufLat);
  const maxLat = Math.min(fixed.maxLat, maxLatView + bufLat);
  const startLon = fixed.minLon + Math.floor((minLon - fixed.minLon) / stepLon) * stepLon;
  const startLat = fixed.minLat + Math.floor((minLat - fixed.minLat) / stepLat) * stepLat;
  const polys: { id: string; coords: [number, number][] }[] = [];
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
      polys.push({ id, coords: coordsLatLng });
    }
  }
  return polys;
}

const kfmeGrid = computed(() => makeGrid(10/60, 6/60));
const smallGrid = computed(() => makeGrid(5/60, 3/60));
const extraSmallGrid = computed(() => makeGrid(2.5/60, 1.5/60));

// Hover state
const hoveredCell = ref<string | null>(null);
function onCellMouseOver(id: string) { hoveredCell.value = id; }
function onCellMouseOut() { hoveredCell.value = null; }
function onCellClick(event: LeafletMouseEvent, p: { id: string; coords: [number, number][] }) {
  event.originalEvent.stopPropagation();

  // center of polygon
  const lat = (p.coords[0][0] + p.coords[2][0]) / 2;
  const lng = (p.coords[0][1] + p.coords[2][1]) / 2;

  const y = Math.floor(560 - lat*10)
  const x = Math.floor(lng*6 - 34)
  router.push(`/mapa/ctverec/${y}${x}`);
}

// Marker icons
function makeIcon(url: string): Icon {
  return new Icon({ iconUrl: url, iconSize: [24, 24], iconAnchor: [19, 19] });
}

const iconMaker = {
  cache: {} as Record<string, Icon>,

  makeMapIcon(name: keyof typeof MapIcons): Icon {
    console.log("Making icon: ", name)

    if (this.cache[name]) return this.cache[name];

    if (!MapIcons[name]) {
      console.error(`Icon ${name} not found`);
      return this.makeMapIcon('Unknown');
    }

    const icon = makeIcon(MapIcons[name].fileName);
    this.cache[name] = icon;
    return icon;
  }
}

const onMapClick = (evt: LeafletMouseEvent) => {
  const { lat, lng } = evt.latlng

  if(mapStore.selectEnabled) {
    mapStore.setSelectedLocation(lat, lng)
  } else {
    router.replace("/");
  }

}


const iconSelected = iconMaker.makeMapIcon('SelectedLocation');
const iconRec = iconMaker.makeMapIcon('RecordingLocation');
const iconCurrent = iconMaker.makeMapIcon('CurrentLocation');
const iconCurrentHeading = iconMaker.makeMapIcon('CurrentLocationWithHeading');

// Handlers for recording click
function onRecordingClick(event: LeafletMouseEvent, rec: RecordingModel, part: RecordingPartModel) {
  event.originalEvent.stopPropagation();

  const lat = part.gpsLatitudeStart
  const lng = part.gpsLongitudeStart

  const targetZoom = 15;
  const originalZoom = 8.25;

  // Duration, in seconds, of the animation that goes from the default zoom to the
  // target zoom.
  const duration = 1;

  leafletMap?.flyTo([lat, lng], targetZoom, {
    animate: true,
    duration: (targetZoom - zoom.value) / (duration * (targetZoom - originalZoom))
  })

  mapStore.setSelectedRecordingLocation(part.gpsLatitudeStart, part.gpsLongitudeStart);
  router.push(`/nahravka/${rec.id}`);
}

function onMapReady(mapComp: any) {
  leafletMap = mapComp.mapObject ?? mapComp;
  updateBounds();
}

const searchUpdateCenter = ([lat, lng]: [number, number]) => {
  center.value = { lat, lng };
  zoom.value = 13;
};
</script>

<template>
  <div class="relative flex flex-1 saturate-[1.15]">
    <l-map
      ref="mapRef"
      class="flex-1"
      v-model:zoom="zoom"
      v-model:center="center"
      :options="{ zoomControl: false }"
      @ready="onMapReady"
      @moveend="updateBounds"
      @click="onMapClick"
    >
      <!-- Tile Layers -->
      <l-tile-layer
        url="/map-loading.png"
        :z-index="0"
      />
      <l-tile-layer
        :url="`${env.VITE_API_URL}/map/v1/maptiles/${mapStore.mode}/${mapStore.mode==='outdoor'? '256@2x':'256'}/{z}/{x}/{y}`"
        :maxZoom="19"
        :z-index="1"
        attribution="<a href='https://api.mapy.cz/copyright' target='_blank'>&copy; Seznam.cz a.s. a další</a>"
      />
      <l-tile-layer
        v-if="mapStore.mode==='aerial'"
        :url="`${env.VITE_API_URL}/map/v1/maptiles/names-overlay/256/{z}/{x}/{y}`"
        :maxZoom="19"
        :z-index="2"
        attribution="<a href='https://api.mapy.cz/copyright' target='_blank'>&copy; Seznam.cz a.s. a další</a>"
      />

      <!-- Grids -->
      <l-polygon
        v-if="zoom > 10 && zoom < 12"
        v-for="cell in kfmeGrid"
        :key="cell.id"
        :lat-lngs="cell.coords"
        :fill-opacity="hoveredCell === cell.id ? 0.1 : 0"
        :color="'rgba(0,0,0,0.3)'"
        :weight="2"
        @mouseover="onCellMouseOver(cell.id)"
        @mouseleave="onCellMouseOut"
        @click="event => onCellClick(event, cell)"
      />

      <l-polygon
        v-if="zoom >= 12 && zoom < 14"
        v-for="cell in smallGrid"
        :key="cell.id"
        :lat-lngs="cell.coords"
        :fill-opacity="hoveredCell === cell.id ? 0.1 : 0"
        :color="'rgba(0,0,0,0.3)'"
        :weight="1"
        @mouseover="onCellMouseOver(cell.id)"
        @mouseleave="onCellMouseOut"
        @click="event => onCellClick(event, cell)"
      />

      <l-polygon
        v-if="zoom >= 14"
        v-for="cell in extraSmallGrid"
        :key="cell.id"
        :lat-lngs="cell.coords"
        :fill-opacity="hoveredCell === cell.id ? 0.1 : 0"
        :color="'rgba(0,0,0,0.3)'"
        :weight="1"
        @mouseover="onCellMouseOver(cell.id)"
        @mouseleave="onCellMouseOut"
        @click="event => onCellClick(event, cell)"
      />

      <!-- Recordings -->
      <l-marker
        v-if="isFetched"
        v-for="({ rec, part, filteredPart }) in recordingsFilter(recordings)
          .flatMap(r =>
            r.parts?.map(p => ({
              rec: r,
              part: p,
              // pick any filtered‑part whose time window overlaps this part
              filteredPart: filteredRecordings
                ?.find(fr =>
                  fr.recordingId === r.id
                  && new Date(p.start) <= new Date(fr.endDate)
                  && new Date(p.end)   >= new Date(fr.startDate)
                )
            }))
          )"
        :key="`${rec.id}-${part.id}`"
        :lat-lng="[part.gpsLatitudeStart, part.gpsLongitudeStart]"
        :icon="iconMaker.makeMapIcon(
          filteredPart
            ?.detectedDialects.find(d => d.confirmedDialect != null)
            ?.confirmedDialect
          ?? 'Unknown'
        )"
        @click="event => onRecordingClick(event, rec, part)"
      />

      <!-- Selected Location -->
      <l-marker
        v-if="mapStore.selectedLocation"
        :lat-lng="[mapStore.selectedLocation.lat, mapStore.selectedLocation.lng]"
        :icon="iconSelected"
      />

      <!-- Selected Recording Location -->
      <l-marker
        v-if="mapStore.selectedRecordingLocation"
        :lat-lng="[mapStore.selectedRecordingLocation.lat, mapStore.selectedRecordingLocation.lng]"
        :icon="iconRec"
      />

      <!-- Current Location -->
      <l-marker
        v-if="currentMapCoords"
        :lat-lng="currentMapCoords"
        :icon="coords.value?.heading ? iconCurrentHeading : iconCurrent"
        :rotation-angle="coords.value?.heading || 0"
      />

      <!-- Controls -->
      <l-control-scale v-if="scaleEnabled" :imperial="false" />

      <!-- Mapy.cz Logo -->
      <l-control position="bottomleft">
        <div class="logocontrol ol-control">
          <a href="http://mapy.cz/" target="_blank">
            <img src="https://api.mapy.cz/img/api/logo.svg" alt="Mapy.cz Logo" />
          </a>
        </div>
      </l-control>

    </l-map>

    <div class="absolute top-0 left-0 w-full z-[10000] hidden max-desktop:flex max-desktop:flex-row flex-col justify-around items-center">
      <LocationSearch
        v-model:text="searchText"
        @update:location="searchUpdateCenter"
        placeholder="Hledat..."
        class="drop-shadow-lg rounded-2xl m-2 p-4 w-full h-[40px]"
      />
    </div>

    <!-- Search & Filter Controls -->
    <div class="absolute bottom-2 right-2 z-[10000] flex sm:flex-row flex-col justify-end items-end">
      <div :class="`max-desktop:hidden`">
        <LocationSearch
          v-model:text="searchText"
          @update:location="searchUpdateCenter"
          placeholder="Hledat..."
          class="drop-shadow-lg rounded-2xl m-2 p-4 w-full sm:w-auto h-[70px]"
        />
      </div>
      <div class="flex flex-row items-end">
        <PrefetchLink
          class="drop-shadow-lg rounded-2xl m-2 hover:bg-gray-100 p-4 bg-white"
          to="/mapa/legenda"
        >
          <InfoIcon width="38" height="38" />
        </PrefetchLink>

        <div class="flex flex-row-reverse items-end">
          <div class="flex flex-col">
            <div v-if="toolsShown" class="flex flex-col-reverse gap-x-2">
              <button @click="scaleEnabled = !scaleEnabled" class="drop-shadow-lg rounded-2xl m-2 bg-white hover:bg-gray-100 p-4">
                <FilledRulerIcon v-if="scaleEnabled" />
                <RulerIcon v-else />
              </button>

              <button @click="mapStore.mode = mapStore.mode==='aerial'?'outdoor':'aerial'" class="drop-shadow-lg rounded-2xl m-2 bg-white hover:bg-gray-100 p-4">
                <MapIcon v-if="mapStore.mode==='aerial'" />
                <PictureIcon v-else />
              </button>
            </div>

            <button @click="toolsShown = !toolsShown" class="drop-shadow-lg rounded-2xl m-2 bg-white hover:bg-gray-100 p-4">
              <ListIcon width="38" height="38" />
            </button>
          </div>

          <select v-model="filter" class="filter-select drop-shadow-lg rounded-2xl m-2 bg-white hover:bg-gray-100" aria-label="Filter recordings">
            <option v-for="(value, key) in availableMapModes" :key="key">{{ value }}</option>
          </select>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.logocontrol {
  z-index: 10;
}

:deep(.ol-control) {
  position: absolute;
  bottom: v-bind("scaleEnabled ? '40px':'20px'") !important;
  left: 0;
  background-color: transparent !important;
}

.filter-select {
  appearance: none;
  background-image: v-bind("`url(\"${FilterIcon}\")`");
  background-repeat: no-repeat;
  background-position: center;
  background-size: 38px 38px;
  width: 70px;
  height: 70px;
  padding: 0;
  text-indent: -9999px;
  cursor: pointer;
}
</style>
