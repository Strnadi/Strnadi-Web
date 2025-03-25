<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { mapStore } from '@/state/MapStore';
import { useQuery } from '@tanstack/vue-query';
import { getRecordings } from '@/api/recording';
import type { RecordingPartModel } from '@/api/types/recording';
import type { MapBrowserEvent } from 'ol';
import { MapIcons } from './MapIcons';
import { useRouter } from 'vue-router';
const env = import.meta.env;

const router = useRouter();
const zoom = ref(8);
const center = ref([15.5, 49.8]);

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
    const coords = event.coordinate;
    mapStore.setSelectedLocation(coords[1], coords[0]);

    return true;
  }

  const featuresAtPixel = event.map.getFeaturesAtPixel(event.pixel);
  if (!featuresAtPixel || featuresAtPixel.length === 0) {
    return true;
  }

  const feature = featuresAtPixel[0];
  const coords = feature.getGeometry()!.getCoordinates();

  for(const recording of recordings.value!) {
    for (const part of recording.parts || []) {
      const partCoords = partAverageCoords(part);
      if (coords[0] === partCoords[0] && coords[1] === partCoords[1]) {
        router.push(`/nahravka/${recording.id}`);
        return true;
      }
    }
  }

  // Don't block dragging event
  return true;
}

const coords = computed(() => {
  const coords = mapStore.selectedLocation!;
  return [coords.lng, coords.lat];
});

</script>

<template>
  <ol-map
    @click="onMapClick"
    :loadTilesWhileAnimating="true"
    :loadTilesWhileInteracting="true"
    :controls="[]"
    ref="mapRef"
    class="w-full h-full"
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

    <!-- First vector layer for recordings -->
    <ol-vector-layer>
      <ol-source-vector v-if="recordings">
        <template v-for="recording in recordings" :key="recording.id">
          <ol-feature v-for="part in recording.parts" :key="part.id">
            <ol-geom-point :coordinates="partAverageCoords(part)" />
            <ol-style>
              <ol-style-icon :src="MapIcons.BC" />
            </ol-style>
          </ol-feature>
        </template>
      </ol-source-vector>
    </ol-vector-layer>

    <!-- Separate vector layer for the marker -->
    <ol-vector-layer>
      <ol-source-vector v-if="mapStore.selectedLocation">
        <ol-feature>
          <ol-geom-point :coordinates="coords" />
          <ol-style>
            <ol-style-icon :src="MapIcons.Unknown" />
          </ol-style>
        </ol-feature>
      </ol-source-vector>
    </ol-vector-layer>

    <ol-attribution-control />
  </ol-map>
</template>
