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
  userEmail: string;
  name: string;
  createdAt: string; // ISO date-time
  estimatedBirdsCount: number;
  byApp: boolean;
  device: string | null;
  note: string | null;
  notePost: string | null;
  parts: RecordingPartModel[] | null;
}

export interface RecordingUploadReq {
  createdAt: string; // ISO date-time
  byApp: boolean;
  estimatedBirdsCount: number;
  device: string;
  name: string;
  note: string | null;
}

export interface RecordingPartUploadReq {
  recordingId: number;
  startDate: string; // ISO date-time
  endDate: string;   // ISO date-time
  gpsLatitudeStart: number;
  gpsLatitudeEnd: number;
  gpsLongitudeStart: number;
  gpsLongitudeEnd: number;
  dataBase64: string;
}

export interface RecordingPartUploadParams {
  startDate: string; // ISO date-time
  endDate: string;   // ISO date-time
  gpsLatitudeStart: number;
  gpsLatitudeEnd: number;
  gpsLongitudeStart: number;
  gpsLongitudeEnd: number;
  data: ArrayBuffer;
};
