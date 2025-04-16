<script setup lang="ts">
// Arguably the ugliest component in this project.
import { computed, ref, watch } from 'vue';
import { mapStore } from '@/state/MapStore';
import { useQuery } from '@tanstack/vue-query';
import { getRecordings } from '@/api/recording';
import type { RecordingModel, RecordingPartModel } from '@/api/types/recording';
import type { MapBrowserEvent } from 'ol';
import { MapIcons } from './MapIcons';
import { useRouter } from 'vue-router';
import LocationSearch from '@/components/map/LocationSearch.vue';
import InfoIcon from '@/assets/icon-info.svg';
import ListIcon from '@/assets/icon-list.svg';
import MapIcon from '@/assets/icon-map.svg';
import RulerIcon from '@/assets/icon-ruler.svg';
import FilledRulerIcon from '@/assets/icon-ruler-fill.svg';
import PictureIcon from '@/assets/icon-picture.svg';

// @ts-expect-error
import FilterIcon from '@/assets/icon-filter2.svg';
import { fromLonLat, toLonLat } from 'ol/proj';
import { useGeolocation } from '@vueuse/core';
import { accountStore } from '@/state/AccountStore';
const env = import.meta.env;

const router = useRouter();
const zoom = ref(8.25);
const currentZoom = ref(zoom.value);

const scale = ref(true);

const showControls = ref(false);

const filter = ref("all");
const { coords, isSupported } = useGeolocation();

const oldCutoff = new Date(2024, 12 - 1, 31);

const filtered = (recordings: RecordingModel[]) => {
  return recordings.filter((recording) => {
    if (filter.value === "my") {
      return recording.userEmail === accountStore.user?.email;
    } else if (filter.value === "others") {
      return recording.userEmail !== accountStore.user?.email;
    } else if(filter.value == "old") {
      return new Date(recording.createdAt) <= oldCutoff
    }

    return true;
  });
};

const currentMapCoords = computed(() => {
  if (!coords.value) {
    return null;
  }

  return fromLonLat([coords.value.longitude, coords.value.latitude]);
});

const centerRef = ref(fromLonLat([15.5, 49.9]));

const center = computed({
  get: () => toLonLat(centerRef.value),
  set: (value) => {
    centerRef.value = fromLonLat(value);
  }
});

const { data: recordings } = useQuery({
  queryKey: ["all-recordings"],
  queryFn: () => getRecordings(),
});

// Function to generate KFME grid polygons
const kfmeGridPolygons = computed(() => {
  const polygons: { id: string, coordinates: number[][][] }[] = []; // Array of polygon coordinate arrays
  const minLon = 12;
  const maxLon = 19.5;
  const minLat = 48.5;
  const maxLat = 51.5;
  const lonStep = 10 / 60; // 10 minutes
  const latStep = 6 / 60;  // 6 minutes

  for (let lon = minLon; lon < maxLon; lon += lonStep) {
    for (let lat = minLat; lat < maxLat; lat += latStep) {
      const lon1 = lon;
      const lat1 = lat;
      const lon2 = lon + lonStep;
      const lat2 = lat + latStep;
      const polygonCoords = [[
        fromLonLat([lon1, lat1]),
        fromLonLat([lon2, lat1]),
        fromLonLat([lon2, lat2]),
        fromLonLat([lon1, lat2]),
        fromLonLat([lon1, lat1]) // Close the polygon
      ]];
      // Generate a unique ID based on coordinates for the key and potential identification
      const id = `kfme-${lon1.toFixed(4)}-${lat1.toFixed(4)}`;
      polygons.push({ id, coordinates: polygonCoords });
    }
  }
  return polygons;
});

// Function to generate small KFME grid polygons
const smallKfmeGridPolygons = computed(() => {
  const polygons: { id: string, coordinates: number[][][] }[] = []; // Array of polygon coordinate arrays
  const minLon = 12;
  const maxLon = 19.5;
  const minLat = 48.5;
  const maxLat = 51.5;
  const lonStep = 10 / 2 / 60; // 5 minutes
  const latStep = 6 / 2 / 60;  // 3 minutes

  for (let lon = minLon; lon < maxLon; lon += lonStep) {
    for (let lat = minLat; lat < maxLat; lat += latStep) {
      const lon1 = lon;
      const lat1 = lat;
      const lon2 = lon + lonStep;
      const lat2 = lat + latStep;
      const polygonCoords = [[
        fromLonLat([lon1, lat1]),
        fromLonLat([lon2, lat1]),
        fromLonLat([lon2, lat2]),
        fromLonLat([lon1, lat2]),
        fromLonLat([lon1, lat1]) // Close the polygon
      ]];
      // Generate a unique ID based on coordinates
      const id = `small-kfme-${lon1.toFixed(4)}-${lat1.toFixed(4)}`;
      polygons.push({ id, coordinates: polygonCoords });
    }
  }
  return polygons;
});

const partAverageCoords = (part: RecordingPartModel) => {
  return [
    (part.gpsLongitudeStart + part.gpsLongitudeEnd) / 2,
    (part.gpsLatitudeStart + part.gpsLatitudeEnd) / 2
  ]
}

function onMapClick(event: MapBrowserEvent<UIEvent>) {
  if(showControls.value) {
    showControls.value = false;
  }

  if (mapStore.selectEnabled) {
    const coords = toLonLat(event.coordinate);
    mapStore.setSelectedLocation(coords[1], coords[0]);
    return true;
  }

  const featuresAtPixel = event.map.getFeaturesAtPixel(event.pixel);
  if (!featuresAtPixel || featuresAtPixel.length === 0) {
    return;
  }

  // Prioritize recording clicks
  for (const feature of featuresAtPixel) {
    const geom = feature.getGeometry();
    if (geom && geom.getType() === 'Point') {
      // @ts-expect-error
      const coords = toLonLat(geom.getCoordinates());
      if (recordings.value) {
        for (const recording of recordings.value) {
          for (const part of recording.parts || []) {
            const partCoords = partAverageCoords(part);
            if (coords[0] === partCoords[0] && coords[1] === partCoords[1]) {
              mapStore.setSelectedRecordingLocation(coords[1], coords[0]);
              router.push(`/nahravka/${recording.id}`);
              return true;
            }
          }
        }
      }
    }
  }

  // Check for grid cell clicks if no recording was clicked
  for (const feature of featuresAtPixel) {
    const geom = feature.getGeometry();
    if (geom && geom.getType() === 'Polygon' && feature.get('isGridCell')) {
      const extent = geom.getExtent();
      const centerCoords = toLonLat([(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2]);
      console.log(`Clicked grid cell. Center (Lon, Lat): ${centerCoords}`);
      // You could store this location or perform other actions here
      // mapStore.setSelectedGridCell(centerCoords); // Example action
      return true;
    }
  }

  return;
}

const userSelectedCoords = computed(() => {
  const coords = mapStore.selectedLocation!;
  return fromLonLat([coords.lng, coords.lat]);
});

const selectedRecordingCoords = computed(() => {
  const coords = mapStore.selectedRecordingLocation!;
  return fromLonLat([coords.lng, coords.lat]);
});

function resolutionChanged(event) {
  currentZoom.value = event.target.getZoom();
}

const searchText = ref("");

watch(center, () => {
  zoom.value = 13;
});

</script>

<template>
  <div class="saturate-[1.15] relative w-full h-full">
    <ol-map
      @click="onMapClick"
      :loadTilesWhileAnimating="true"
      :loadTilesWhileInteracting="true"
      :controls="[]"
      ref="mapRef"
      class="w-full h-full"
    >
      <ol-view
        :projection="'EPSG:3857'"
        :enableRotation="false"
        :center="centerRef"
        :zoom="zoom"
        @change:resolution="resolutionChanged"
      />

      <ol-webgl-tile-layer>
        <ol-source-xyz
          url="/map-loading.png"
          z-index="0"
          name="Loading"
        />
      </ol-webgl-tile-layer>

      <ol-webgl-tile-layer>
        <ol-source-xyz
          :url="`${env.VITE_API_URL}/map/v1/maptiles/${mapStore.mode}/${mapStore.mode == 'outdoor' ? '256@2x' : '256'}/{z}/{x}/{y}`"
          :z-index="1"
          name="Base"
          :max-zoom="19"
          attributions='<a href="https://api.mapy.cz/copyright" target="_blank">&copy; Seznam.cz a.s. a další</a>'
        />
      </ol-webgl-tile-layer>

      <ol-webgl-tile-layer>
        <ol-source-xyz
          v-if="mapStore.mode === 'aerial'"
          :url="`${env.VITE_API_URL}/map/v1/maptiles/names-overlay/256/{z}/{x}/{y}`"
          :z-index="2"
          :maxZoom="19"
          name="AerialNames"
          attributions='<a href="https://api.mapy.cz/copyright" target="_blank">&copy; Seznam.cz a.s. a další</a>'
        />
      </ol-webgl-tile-layer>

      <ol-vector-layer v-if="currentZoom > 10" :zIndex="3">
        <ol-source-vector>
          <ol-feature v-for="polygon in kfmeGridPolygons" :key="polygon.id" :properties="{ isGridCell: true, isSmallGridCell: false }">
            <ol-geom-polygon :coordinates="polygon.coordinates"></ol-geom-polygon>
            <ol-style>
              <ol-style-fill :color="`rgba(0, 0, 0, ${Math.max(0, (currentZoom - 13) / 10)})`"></ol-style-fill>
              <ol-style-stroke color="rgba(0, 0, 0, 0.3)" :width="currentZoom < 13 ? 1 : 2"></ol-style-stroke>
            </ol-style>
          </ol-feature>
        </ol-source-vector>
      </ol-vector-layer>

      <ol-vector-layer v-if="currentZoom >= 13" :zIndex="4">
        <ol-source-vector>
          <ol-feature v-for="polygon in smallKfmeGridPolygons" :key="polygon.id" :properties="{ isGridCell: true, isSmallGridCell: true }">
            <ol-geom-polygon :coordinates="polygon.coordinates"></ol-geom-polygon>
            <ol-style>
              <ol-style-fill :color="`rgba(0, 0, 0, 0.0)`"></ol-style-fill>
              <ol-style-stroke color="rgba(0, 0, 0, 0.3)" :width="1"></ol-style-stroke>
            </ol-style>
          </ol-feature>
        </ol-source-vector>
      </ol-vector-layer>

      <ol-vector-layer>
        <ol-source-vector v-if="recordings">
          <template v-for="recording in filtered(recordings)" :key="recording.id">
            <ol-feature v-for="part in recording.parts" :key="part.id">
              <ol-geom-point :coordinates="fromLonLat(partAverageCoords(part))" />
              <ol-style>
                <ol-style-icon :src="MapIcons.Unknown.fileName" />
              </ol-style>
            </ol-feature>
          </template>
        </ol-source-vector>
      </ol-vector-layer>

      <ol-vector-layer v-if="mapStore.selectedLocation">
        <ol-source-vector>
          <ol-feature>
            <ol-geom-point :coordinates="userSelectedCoords" />
            <ol-style>
              <ol-style-icon :src="MapIcons.SelectedLocation.fileName" />
            </ol-style>
          </ol-feature>
        </ol-source-vector>
      </ol-vector-layer>

      <ol-vector-layer v-if="mapStore.selectedRecordingLocation">
        <ol-source-vector>
          <ol-feature>
            <ol-geom-point :coordinates="selectedRecordingCoords" />
            <ol-style>
              <ol-style-icon :src="MapIcons.RecordingLocation.fileName" />
            </ol-style>
          </ol-feature>
        </ol-source-vector>
      </ol-vector-layer>

      <ol-vector-layer v-if="currentMapCoords">
        <ol-source-vector>
          <ol-feature>
            <ol-geom-point :coordinates="currentMapCoords" />
            <ol-style>
              <ol-style-icon
                v-if="coords.heading"
                :src="MapIcons.CurrentLocationWithHeading.fileName"
                :rotation="coords.heading * (Math.PI / 180)"
              />
              <ol-style-icon
                v-else
                :src="MapIcons.CurrentLocation.fileName"
              />
            </ol-style>
          </ol-feature>
        </ol-source-vector>
      </ol-vector-layer>

      <ol-scaleline-control v-if="scale" :bar="true" />
      <ol-attribution-control />
      <v-ol-control position="bottom-left">
        <div class="logocontrol ol-control">
          <a href="http://mapy.cz/" target="_blank">
            <img src="https://api.mapy.cz/img/api/logo.svg" class="bg-transparent" alt="Mapy.cz Logo" />
          </a>
        </div>
      </v-ol-control>
    </ol-map>

    <div class="absolute bottom-2 right-2 z-[6] flex sm:flex-row flex-col justify-end items-end">
      <div :class="`flex flex-row ${!showControls ? 'max-md:hidden' : 'block'} gap-x-2 gap-y-2`">
        <LocationSearch
          v-model:text="searchText"
          v-model:location="center"
          placeholder="Hledat..."
          class="drop-shadow-lg rounded-2xl m-2 p-4 w-full sm:w-auto h-[70px]"
        />
        <select
          v-model="filter"
          class="filter-select drop-shadow-lg rounded-2xl m-2 hover:bg-gray-100 bg-white"
          aria-label="Filter recordings"
        >
          <option value="dialect">Jen nahrávky s dialektem</option>
          <option value="new">Jen nové nahrávky</option>
          <option value="old">Jen staré nahrávky</option>
          <template v-if="accountStore.user">
            <option value="my">Jen moje nahrávky</option>
            <option value="others">Jen nahrávky ostatních</option>
          </template>
          <option value="all">Všechny nahrávky</option>
        </select>
      </div>

      <div class="flex flex-row">
        <PrefetchLink
          to="/mapa/legenda"
          class="drop-shadow-lg rounded-2xl m-2 hover:bg-gray-100 p-4 bg-white h-fit self-end"
        >
          <img :src="InfoIcon" :width="38" :height="38" />
        </PrefetchLink>
        <div class="flex max-md:flex-row-reverse flex-col-reverse gap-x-2">
          <button :class="`drop-shadow-lg rounded-2xl m-2 ${showControls ? 'bg-gray-100' : 'bg-white hover:bg-gray-100'} p-4`" @click="showControls = !showControls">
            <img :src="ListIcon" :width="38" :height="38" />
          </button>
          <div v-if="showControls" class="flex max-md:flex-row-reverse flex-col-reverse gap-x-2">
            <button
              class="drop-shadow-lg rounded-2xl m-2 hover:bg-gray-100 p-4 bg-white"
              @click="mapStore.mode = mapStore.mode == 'aerial' ? 'outdoor' : 'aerial'"
            >
              <img :src="mapStore.mode == 'aerial' ? MapIcon : PictureIcon" :width="38" :height="38" />
            </button>
            <button
              class="drop-shadow-lg rounded-2xl m-2 hover:bg-gray-100 p-4 bg-white"
              @click="scale = !scale"
            >
              <img :src="scale ? FilledRulerIcon : RulerIcon" :width="38" :height="38" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.logocontrol {
  z-index: 10;
}

.ol-control {
  position: absolute;
  bottom: v-bind("scale ? '40px' : '20px'") !important;
  left: 0px;
  background-color: transparent !important;
}

/* Ensure attribution text is readable */
:deep(.ol-attribution ul) {
  margin: 0;
  padding: 0;
  display: inline; /* Helps with vertical layout */
}

:deep(.ol-attribution li) {
  display: inline; /* Helps with vertical layout */
  list-style: none;
}

:deep(.ol-attribution.ol-uncollapsible) {
  right: auto !important;
  left: 0 !important;
  bottom: v-bind("scale ? '120px' : '0px'") !important;

  writing-mode: v-bind("scale ? 'vertical-rl' : 'revert'") !important;
  text-orientation: v-bind("scale ? 'mixed' : 'revert'") !important;
  transform: v-bind("scale ? 'rotate(180deg)' : 'revert'") !important;
}

.filter-select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
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
