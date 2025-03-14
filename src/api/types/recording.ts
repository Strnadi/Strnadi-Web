export interface RecordingPartModel {
  id: number;
  recordingId: number;
  start: string; // ISO date-time
  end: string;   // ISO date-time
  gpsLatitudeStart: number;
  gpsLatitudeEnd: number;
  gpsLongitudeStart: number;
  gpsLongitudeEnd: number;
  square?: string | null;
  filePath?: string | null;
  dataBase64?: string | null;
}

export interface RecordingModel {
  id: number;
  userId: number;
  createdAt: string; // ISO date-time
  estimatedBirdsCount: number;
  device?: string | null;
  byApp: boolean;
  note?: string | null;
  notePost?: string | null;
  parts?: RecordingPartModel[] | null;
}

export interface RecordingUploadReq {
  createdAt: string; // ISO date-time
  byApp: boolean;
  estimatedBirdsCount: number;
  device: string;
  note: string | null;
}

export interface RecordingPartUploadReq {
  recordingId: number;
  startDate: string; // ISO date-time
  endDate: string;   // ISO date-time
  latitudeStart: number;
  latitudeEnd: number;
  longitudeStart: number;
  longitudeEnd: number;
  data?: string | null;
}
