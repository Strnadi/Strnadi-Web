import { remove } from 'ol/array';
import { reactive } from 'vue'

type LatLng = {
  lat: number;
  lng: number;
};

export const uploadStore = reactive({
  stage: 0 as number,
  parts: null as { recording: File; content: ArrayBuffer }[] | null,
  photos: null as File[] | null,
  location: null as LatLng | null,
  note: "" as string | null,
  title: "" as string | null,
  device: "" as string | null,
  birdCount: 1,
  dateTime: new Date().toISOString(),

  resetStage() {
    this.stage = 0
  },

  prevStage() {
    if (this.stage > 0) {
      this.stage--
    }
  },

  nextStage() {
    this.stage++
  },

  setPhotos(photos: File[]) {
    this.photos = photos
  },

  setBirdCount(count: number) {
    this.birdCount = count 
  },

  setLocation(location: LatLng) {
    this.location = location
  },

  setNote(note: string) {
    this.note = note
  },

  setTitle(title: string) {
    this.title = title
  },

  setDevice(device: string) {
    this.device = device
  },

  async setRecordings(recordings: File[]) {
    const recordingsWithContent = await Promise.all(
      recordings.map(async (recording) => {
        const content = await recording.arrayBuffer();
        return { recording, content };
      })
    );

    this.parts = recordingsWithContent;
  },

  removePart(recording: File) {
    if (this.parts) {
      this.parts = this.parts.filter((part) => part.recording !== recording);
    }
  },

  removePartByIndex(index: number) {
    if (this.parts) {
      this.parts.splice(index, 1);
    }
  }

});
