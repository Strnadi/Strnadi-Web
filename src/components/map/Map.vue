<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { mapStore } from '@/state/MapStore';
import { useQuery } from '@tanstack/vue-query';
import { getRecordings } from '@/api/recording';
import type { RecordingPartModel } from '@/api/types/recording';
import type { MapBrowserEvent } from 'ol';
import { MapIcons } from './MapIcons';
import { useRouter } from 'vue-router';
import LocationSearch from '@/components/map/LocationSearch.vue';
import MapButtons from '@/components/map/MapButtons.vue';
import { fromLonLat, toLonLat } from 'ol/proj';
import { accountStore } from '@/state/AccountStore';
import type { Coordinate } from 'ol/coordinate';
const env = import.meta.env;

const router = useRouter();
const zoom = ref(8.25);

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

const searchQuery = ref();
watch(searchQuery, (newValue) => {
  if (newValue) {
    console.log(newValue);
    center.value = [newValue.position.lon, newValue.position.lat];
    zoom.value = 13;
  }
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
        :center="centerRef"
        :enableRotation="false"
        :zoom="zoom"
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

      <ol-vector-layer>
        <ol-source-vector v-if="recordings">
          <template v-for="recording in recordings" :key="recording.id">
            <ol-feature v-for="part in recording.parts" :key="part.id">
              <ol-geom-point :coordinates="fromLonLat(partAverageCoords(part))" />
              <ol-style>
                <ol-style-icon :src="MapIcons.Unknown.fileName" />
              </ol-style>
            </ol-feature>
          </template>
        </ol-source-vector>
      </ol-vector-layer>

      <ol-vector-layer>
        <ol-source-vector v-if="mapStore.selectedLocation">
          <ol-feature>
            <ol-geom-point :coordinates="userSelectedCoords" />
            <ol-style>
              <ol-style-icon :src="MapIcons.SelectedLocation.fileName" />
            </ol-style>
          </ol-feature>
        </ol-source-vector>
      </ol-vector-layer>

      <ol-vector-layer>
        <ol-source-vector v-if="mapStore.selectedRecordingLocation">
          <ol-feature>
            <ol-geom-point :coordinates="selectedRecordingCoords" />
            <ol-style>
              <ol-style-icon :src="MapIcons.RecordingLocation.fileName" />
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

    <div class="absolute bottom-2 right-2 z-[6] flex flex-row justify-end items-center">
      <!-- Let's only allow authenticated users to search -->
      <LocationSearch v-if="accountStore.user" v-model="searchQuery" placeholder="Hledat..." />
      <MapButtons />
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
}

:deep(.ol-attribution) {
  left: 0 !important;
  right: auto !important;
}
</style>
