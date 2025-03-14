<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { mapStore } from '@/state/MapStore';
import { useQuery } from '@tanstack/vue-query';
import { getRecordings } from '@/api/recording';
import type { RecordingPartModel } from '@/api/types/recording';
import type { MapBrowserEvent } from 'ol';
const env = import.meta.env;

const center = ref([15.5, 49.8]);
const zoom = ref(8);

const recordings = useQuery({
  queryKey: ["all-recordings"],
  queryFn: getRecordings,
});

const ICONS = {
  BC: "/dialects/dialect-bc.svg",
  BE: "/dialects/dialect-be.svg",
  XB: "/dialects/dialect-xb.svg",
  BhBl: "/dialects/dialect-bhbl.svg",
  BlBH: "/dialects/dialect-blbh.svg",
  Unknown: "/dialects/dialect-unknown.svg",
  Other: "/dialects/dialect-other.svg",
  NotSure: "/dialects/dialect-notsure.svg",
  Marker: "/marker.svg",
};

const partAverageCoords = (part: RecordingPartModel) => {
  return [
    (part.gpsLatitudeStart + part.gpsLatitudeEnd) / 2,
    (part.gpsLongitudeStart + part.gpsLongitudeEnd) / 2
  ]
}

const selectInteactionFilter = (feature) => {
  return feature.values_.name != undefined;
};

function onFeatureSelect(event: MapBrowserEvent<UIEvent>) {
  if (event.selected.length) {
    const feature = event.selected[0];
    const coords = feature.getGeometry().getCoordinates();
    console.log(coords);
  }
}

function onMapClick(event: MapBrowserEvent<UIEvent>) {
  const coords = event.coordinate;
  mapStore.setSelectedLocation(coords[1], coords[0]);

  return true;
}

const coords = computed(() => {
  const coords = mapStore.selectedLocation!;
  return [coords.lng, coords.lat];
});

</script>

<template>
  <ol-map
    :loadTilesWhileAnimating="true"
    :loadTilesWhileInteracting="true"
    :controls="[]"
    ref="mapRef"
    class="w-full h-full"
    @click="onMapClick"
  >
    <ol-view
      :center="center"
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
        :url="`https://api.mapy.cz/v1/maptiles/${mapStore.mode}/256/{z}/{x}/{y}?apikey=${env.VITE_MAPYCZ_API_KEY}`"
        :z-index="1"
        name="Base"
        attribution='<a href="https://api.mapy.cz/copyright" target="_blank">&copy; Seznam.cz a.s. a další</a>'
      />
    </ol-tile-layer>

    <ol-tile-layer>
      <ol-source-xyz
        v-if="mapStore.mode === 'aerial'"
        :url="`https://api.mapy.cz/v1/maptiles/aerial/256/{z}/{x}/{y}?apikey=${env.VITE_MAPYCZ_API_KEY}`"
        :z-index="2"
        name="AerialNames"
        attribution='<a href="https://api.mapy.cz/copyright" target="_blank">&copy; Seznam.cz a.s. a další</a>'
      />
    </ol-tile-layer>

    <ol-vector-layer>
      <ol-source-vector v-if="recordings">
        <template v-for="recording in recordings" :key="recording.id">
          <ol-feature v-for="part in recording.parts" :key="part.id">
            <ol-geom-point :coordinates="partAverageCoords(part)" />
            <ol-style>
              <ol-style-icon :src="ICONS.BC" />
            </ol-style>
          </ol-feature>
        </template>
      </ol-source-vector>

      <ol-source-vector v-if="mapStore.selectedLocation">
        <ol-feature>
          <ol-geom-point :coordinates="coords" />
          <ol-style>
            <ol-style-icon :src="ICONS.Unknown" />
          </ol-style>
        </ol-feature>
      </ol-source-vector>
    </ol-vector-layer>

    <ol-interaction-select
      @select="onFeatureSelect"
      :filter="selectInteactionFilter"
    />
  </ol-map>
</template>
