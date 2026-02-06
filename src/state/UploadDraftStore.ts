import { reactive } from 'vue';

export const soundAccept = [
  'audio/*',
  'application/ogg',
  'application/vorbis'
];

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RecordingPartDraft {
  file: File;
  location: LatLng | null;
}

export interface DraftDetectedDialect {
  id: number;
  filteredPartId: number;
  userGuessDialectId?: number | null;
  predictedDialectId?: number | null;
  confirmedDialectId?: number | null;
}

export interface DraftFilteredPart {
  id: number;
  startDate: string;
  endDate: string;
  parentId: number;
  recordingId: number;
  state: number;
  representantFlag?: boolean;
  dialectCode: string | null;
  detectedDialects: DraftDetectedDialect[];
}

export const uploadStore = reactive({
  parts: null as RecordingPartDraft[] | null,
  photos: null as File[] | null,
  dialects: [] as string[],
  note: '' as string | null,
  title: '' as string,
  device: '' as string | null,
  birdCount: 1,
  dateTime: new Date().toISOString(),
  notificationsOptIn: false,
  confirmUpload: false,
  draftFilteredParts: [] as DraftFilteredPart[],
  nextPartId: 1,
  nextDetectionId: 1,

  setRecordings(recordings: File[]) {
    this.parts ??= [];
    this.parts.push(
      ...(recordings.map((recording) => ({
        file: recording,
        location: null
      })) as RecordingPartDraft[])
    );
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

  resetDialects() {
    this.draftFilteredParts = [];
    this.nextPartId = 1;
    this.nextDetectionId = 1;
  },

  reset() {
    this.parts = null;
    this.photos = null;
    this.dialects = [];
    this.note = null;
    this.title = '';
    this.device = null;
    this.birdCount = 1;
    this.dateTime = new Date().toISOString();
    this.notificationsOptIn = false;
    this.confirmUpload = false;
    this.resetDialects();
  },

  createDraftFilteredPart(
    part: Omit<DraftFilteredPart, 'id' | 'detectedDialects'> & {
      detectedDialects?: DraftDetectedDialect[];
    }
  ): DraftFilteredPart {
    const created: DraftFilteredPart = {
      ...part,
      id: this.nextPartId++,
      detectedDialects: part.detectedDialects ?? []
    };
    this.draftFilteredParts.push(created);
    return created;
  },

  updateDraftFilteredPart(
    id: number,
    patch: Partial<Omit<DraftFilteredPart, 'id'>>
  ) {
    const idx = this.draftFilteredParts.findIndex((p) => p.id === id);
    if (idx === -1) return;
    this.draftFilteredParts[idx] = {
      ...this.draftFilteredParts[idx],
      ...patch
    };
  },

  deleteDraftFilteredPart(id: number) {
    this.draftFilteredParts = this.draftFilteredParts.filter(
      (p) => p.id !== id
    );
  },

  replaceDraftFilteredParts(parts: DraftFilteredPart[]) {
    this.draftFilteredParts = [...parts];
  },

  createDraftDetection(
    filteredPartId: number,
    detection: Omit<DraftDetectedDialect, 'id' | 'filteredPartId'>
  ): DraftDetectedDialect {
    const created: DraftDetectedDialect = {
      ...detection,
      id: this.nextDetectionId++,
      filteredPartId
    };
    const part = this.draftFilteredParts.find((p) => p.id === filteredPartId);
    if (part) {
      part.detectedDialects.push(created);
    }
    return created;
  },

  updateDraftDetection(
    detectionId: number,
    patch: Partial<Omit<DraftDetectedDialect, 'id' | 'filteredPartId'>>
  ) {
    this.draftFilteredParts.forEach((part) => {
      const idx = part.detectedDialects.findIndex((d) => d.id === detectionId);
      if (idx !== -1) {
        part.detectedDialects[idx] = {
          ...part.detectedDialects[idx],
          ...patch
        };
      }
    });
  },

  deleteDraftDetection(detectionId: number) {
    this.draftFilteredParts.forEach((part) => {
      part.detectedDialects = part.detectedDialects.filter(
        (d) => d.id !== detectionId
      );
    });
  }
});
