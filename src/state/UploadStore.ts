import { reactive } from 'vue'

interface LatLng {
  lat: number;
  lng: number;
};

interface RecordingPart {
  file: File;
  location: LatLng | null;
};

export const uploadStore = reactive({
  stage: 0 as number,
  parts: null as RecordingPart[] | null,
  photos: null as File[] | null,
  dialects: [] as string[],
  note: "" as string | null,
  title: "" as string,
  device: "" as string | null,
  birdCount: 1,
  dateTime: new Date().toISOString(),
  confirmUpload: false,

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
    this.parts = recordings.map((recording) => ({
      file: recording,
      location: null
    })) as RecordingPart[];
  },

  removePart(recording: File) {
    if (this.parts) {
      this.parts = this.parts.filter((part) => part.file !== recording);
    }
  },

  removePartByIndex(index: number) {
    if (this.parts) {
      this.parts.splice(index, 1);
    }
  },

  reset() {
    this.stage = 0;
    this.parts = null;
    this.photos = null;
    this.dialects = [];
    this.note = null;
    this.title = "";
    this.device = null;
    this.birdCount = 1;
    this.dateTime = new Date().toISOString();
  }

});
