import { reactive } from 'vue'

export interface LatLng {
  lat: number;
  lng: number;
};

export const mapStore = reactive({
  selectedLocation: null as LatLng | null,
  mode: "outdoor" as "aerial" | "basic" | "outdoor",

  setSelectedLocation(lat: number, lng: number) {
    this.selectedLocation = { lat, lng };
  },
  setMode(mode: "aerial" | "basic" | "outdoor") {
    this.mode = mode;
  },
});
