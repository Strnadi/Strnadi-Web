import { reactive } from 'vue';

export const soundAccept = [
  'audio/wav',
  'audio/mpeg',
  'audio/mp4',
  'audio/flac',
  'audio/aac',
  'audio/ogg',
  'audio/webm'
];

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RecordingPartDraft {
  id: string;
  file: File;
  location: LatLng | null;
  duration: number;
  latitudeInput: string;
  longitudeInput: string;
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
  recordingPartId?: string;
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

  setRecordings(recordings: File[], durations: number[] = []) {
    this.parts ??= [];
    this.parts.push(
      ...(recordings.map((recording, index) => ({
        id: crypto.randomUUID(),
        file: recording,
        location: null,
        duration: durations[index] ?? 0,
        latitudeInput: '',
        longitudeInput: ''
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
      const removed = this.parts[index];
      if (!removed) return;
      const removedStart =
        new Date(this.dateTime).getTime() +
        this.parts
          .slice(0, index)
          .reduce((total, part) => total + part.duration * 1000, 0);
      const removedEnd = removedStart + removed.duration * 1000;

      this.draftFilteredParts = this.draftFilteredParts
        .filter((part) => {
          if (part.recordingPartId) return part.recordingPartId !== removed.id;
          const start = Date.parse(part.startDate);
          return start < removedStart || start >= removedEnd;
        })
        .map((part) => {
          if (Date.parse(part.startDate) < removedEnd) return part;
          return {
            ...part,
            startDate: new Date(
              Date.parse(part.startDate) - removed.duration * 1000
            ).toISOString(),
            endDate: new Date(
              Date.parse(part.endDate) - removed.duration * 1000
            ).toISOString()
          };
        });
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
    const partTime = Date.parse(part.startDate);
    let cursor = Date.parse(this.dateTime);
    const recordingPartId = this.parts?.find((recordingPart) => {
      const start = cursor;
      cursor += recordingPart.duration * 1000;
      return partTime >= start && partTime < cursor;
    })?.id;
    const created: DraftFilteredPart = {
      ...part,
      id: this.nextPartId++,
      detectedDialects: part.detectedDialects ?? [],
      recordingPartId
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
    const current = this.draftFilteredParts[idx];
    if (!current) return;
    this.draftFilteredParts[idx] = {
      ...current,
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
        const current = part.detectedDialects[idx];
        if (!current) return;
        part.detectedDialects[idx] = {
          ...current,
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
