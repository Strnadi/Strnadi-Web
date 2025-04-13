<script setup lang="ts">
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
import MapIcon from '@/assets/icon-map.svg';
import PictureIcon from '@/assets/icon-picture.svg';
import { fromLonLat, toLonLat } from 'ol/proj';
import { useGeolocation } from '@vueuse/core';
import { accountStore } from '@/state/AccountStore';
const env = import.meta.env;

const router = useRouter();
const zoom = ref(8.25);
const currentZoom = ref(zoom.value);

const filter = ref("all");
const { coords } = useGeolocation();

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

// Function to generate KFME grid line coordinates
const kfmeGridLines = computed(() => {
  const lines: number[][][] = []; // Array of line coordinate pairs
  const minLon = 12;
  const maxLon = 19.5;
  const minLat = 48.5;
  const maxLat = 51.5;
  const lonStep = 10 / 60; // 10 minutes
  const latStep = 6 / 60;  // 6 minutes

  // Vertical lines (Longitude lines)
  for (let lon = minLon; lon <= maxLon; lon += lonStep) {
    const lineCoords = [
      fromLonLat([lon, minLat]),
      fromLonLat([lon, maxLat])
    ];
    lines.push(lineCoords);
  }

  // Horizontal lines (Latitude lines)
  for (let lat = minLat; lat <= maxLat; lat += latStep) {
    const lineCoords = [
      fromLonLat([minLon, lat]),
      fromLonLat([maxLon, lat])
    ];
    lines.push(lineCoords);
  }

  return lines;
});

const smallKfmeGridLines = computed(() => {
  const lines: number[][][] = []; // Array of line coordinate pairs
  const minLon = 12;
  const maxLon = 19.5;
  const minLat = 48.5;
  const maxLat = 51.5;
  const lonStep = 10 / 2 / 60; // 10 minutes
  const latStep = 6 / 2 / 60;  // 6 minutes

  // Vertical lines (Longitude lines)
  for (let lon = minLon; lon <= maxLon; lon += lonStep) {
    const lineCoords = [
      fromLonLat([lon, minLat]),
      fromLonLat([lon, maxLat])
    ];
    lines.push(lineCoords);
  }

  // Horizontal lines (Latitude lines)
  for (let lat = minLat; lat <= maxLat; lat += latStep) {
    const lineCoords = [
      fromLonLat([minLon, lat]),
      fromLonLat([maxLon, lat])
    ];
    lines.push(lineCoords);
  }

  return lines;
});

const partAverageCoords = (part: RecordingPartModel) => {
  return [
    (part.gpsLongitudeStart + part.gpsLongitudeEnd) / 2,
    (part.gpsLatitudeStart + part.gpsLatitudeEnd) / 2
  ]
}

function onMapClick(event: MapBrowserEvent<UIEvent>) {
  if (mapStore.selectEnabled) {
    const coords = toLonLat(event.coordinate);
    mapStore.setSelectedLocation(coords[1], coords[0]);

    return true;
  }

  const featuresAtPixel = event.map.getFeaturesAtPixel(event.pixel);
  if (!featuresAtPixel || featuresAtPixel.length === 0) {
    return true;
  }

  const feature = featuresAtPixel[0];

  // @ts-expect-error
  const coords = toLonLat(feature.getGeometry()!.getCoordinates());

  for(const recording of recordings.value!) {
    for (const part of recording.parts || []) {
      const partCoords = partAverageCoords(part);
      if (coords[0] === partCoords[0] && coords[1] === partCoords[1]) {
        mapStore.setSelectedRecordingLocation(coords[1], coords[0]);

        router.push(`/nahravka/${recording.id}`);
        return true;
      }
    }
  }

  // Don't block dragging event
  return true;
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

      <ol-tile-layer>
        <ol-source-xyz
          url="/map-loading.png"
          z-index="0"
          name="Loading"
        />
      </ol-tile-layer>

      <ol-tile-layer>
        <ol-source-xyz
          :url="`https://api.mapy.cz/v1/maptiles/${mapStore.mode}/${mapStore.mode == 'outdoor' ? '256@2x' : '256'}/{z}/{x}/{y}?apikey=${env.VITE_MAPYCZ_API_KEY}`"
          :z-index="1"
          name="Base"
          :max-zoom="19"
          attributions='<a href="https://api.mapy.cz/copyright" target="_blank">&copy; Seznam.cz a.s. a další</a>'
        />
      </ol-tile-layer>

      <ol-tile-layer>
        <ol-source-xyz
          v-if="mapStore.mode === 'aerial'"
          :url="`https://api.mapy.cz/v1/maptiles/names-overlay/256/{z}/{x}/{y}?apikey=${env.VITE_MAPYCZ_API_KEY}`"
          :z-index="2"
          :maxZoom="19"
          name="AerialNames"
          attributions='<a href="https://api.mapy.cz/copyright" target="_blank">&copy; Seznam.cz a.s. a další</a>'
        />
      </ol-tile-layer>

      <ol-vector-layer v-if="currentZoom > 10" :zIndex="3">
        <ol-source-vector>
          <ol-feature v-for="(lineCoords, index) in kfmeGridLines" :key="`kfme-line-${index}`">
            <ol-geom-line-string :coordinates="lineCoords"></ol-geom-line-string>
            <ol-style>
              <ol-style-stroke color="rgba(0, 0, 0, 0.3)" :width="1"></ol-style-stroke>
            </ol-style>
          </ol-feature>
        </ol-source-vector>
      </ol-vector-layer>

      <ol-vector-layer v-if="currentZoom >= 13" :zIndex="4">
        <ol-source-vector>
          <ol-feature v-for="(lineCoords, index) in smallKfmeGridLines" :key="`small-kfme-line-${index}`">
            <ol-geom-line-string :coordinates="lineCoords"></ol-geom-line-string>
            <ol-style>
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
              <ol-style-icon :src="MapIcons.CurrentLocation.fileName" />
            </ol-style>
          </ol-feature>
        </ol-source-vector>
      </ol-vector-layer>

      <ol-attribution-control />
      <v-ol-control position="bottom-left">
        <div class="logocontrol ol-control">
          <a href="http://mapy.cz/" target="_blank">
            <img src="https://api.mapy.cz/img/api/logo.svg" class="bg-transparent" alt="Mapy.cz Logo" />
          </a>
        </div>
      </v-ol-control>
    </ol-map>

    <div class="absolute bottom-2 right-2 z-[6] flex sm:flex-row flex-col justify-end items-center">
      <!-- Let's only allow authenticated users to search -->
      <LocationSearch
        v-model:text="searchText"
        v-model:location="center"
        placeholder="Hledat..."
        class="drop-shadow-lg rounded-2xl m-2 p-4 w-full sm:w-auto"
      />

      <select v-model="filter" class="drop-shadow-lg rounded-2xl m-2 hover:bg-gray-100 p-5 w-full sm:w-auto bg-white" value="all">
        <option value="my">Jen moje nahrávky</option>
        <option value="others">Jen nahrávky ostatních</option>
        <option value="old">Jen staré nahrávky</option>
        <option value="all">Všechny nahrávky</option>
      </select>

      <div class="flex flex-row gap-x-2">
        <PrefetchLink
          to="/mapa/legenda"
          class="drop-shadow-lg rounded-2xl m-2 hover:bg-gray-100 p-4 bg-white"
        >
          <img :src="InfoIcon" />
        </PrefetchLink>
        <button
          class="drop-shadow-lg rounded-2xl m-2 hover:bg-gray-100 p-4 bg-white"
          @click="mapStore.mode = mapStore.mode == 'aerial' ? 'outdoor' : 'aerial'"
        >
          <img :src="mapStore.mode == 'aerial' ? MapIcon : PictureIcon" />
        </button>
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
  bottom: 20px;
  left: 0px;
  background-color: transparent !important;
}

:deep(.ol-attribution) {
  left: 0 !important;
  right: auto !important;
}
</style>
