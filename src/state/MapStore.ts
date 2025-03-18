import { reactive } from 'vue'

export interface LatLng {
  lat: number;
  lng: number;
};

export const mapStore = reactive({
  selectedLocation: null as LatLng | null,
  mode: "outdoor" as "aerial" | "basic" | "outdoor",
  selectEnabled: false,

  setSelectedLocation(lat: number, lng: number) {
    this.selectedLocation = { lat, lng };
  },

  setMode(mode: typeof this.mode) {
    this.mode = mode;
  },

  setSelectEnabled(enabled: boolean) {
    this.selectEnabled = enabled;
  }
});
