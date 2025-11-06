import axios from 'axios';
import { postPhoto } from './photos';
import { authorizedPatch, authorizedDelete, authorizedPost } from './utils';
import type { Numeric } from '@/types/basic';

export interface RecordingPartModel {
  id: number;
  recordingId: number;
  startDate: string; // ISO date-time
  endDate: string; // ISO date-time
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
  name: string;
  createdAt: string; // ISO date-time
  estimatedBirdsCount: number;
  byApp: boolean;
  device: string | null;
  note: string | null;
  notePost: string | null;
  parts: RecordingPartModel[] | null;
}

export interface DetectedDialect {
  id: number;
  userGuessDialectId: number;
  confirmedDialectId: number;
  predictedDialectId: number;
  userGuessDialect: string | null;
  confirmedDialect: string | null;
  predictedDialect: string | null;
  filteredRecordingPartId: number;
}

export interface FilteredPartModel {
  id: number;
  startDate: string;
  endDate: string;
  state: number;
  recordingId: number;
  detectedDialects: DetectedDialect[] | null;
  representantFlag: boolean;
}

export interface RecordingUploadReq {
  createdAt: string; // ISO date-time
  byApp: boolean;
  estimatedBirdsCount: number;
  device: string;
  name: string;
  note: string | null;
  expectedPartsCount: number;
}

export interface RecordingPartUploadReq {
  recordingId: number;
  startDate: string; // ISO date-time
  endDate: string; // ISO date-time
  gpsLatitudeStart: number;
  gpsLatitudeEnd: number;
  gpsLongitudeStart: number;
  gpsLongitudeEnd: number;
  dataBase64: string;
}

export interface RecordingPartUploadParams {
  startDate: string; // ISO date-time
  endDate: string; // ISO date-time
  gpsLatitudeStart: number;
  gpsLatitudeEnd: number;
  gpsLongitudeStart: number;
  gpsLongitudeEnd: number;
  data: File;
}

const toBase64 = (content: ArrayBuffer) =>
  btoa(
    new Uint8Array(content).reduce(
      (data, byte) => data + String.fromCharCode(byte),
      ''
    )
  );

export const postRecording = async (
  token: string,
  recording: RecordingUploadReq,
  recordingParts: RecordingPartUploadParams[],
  photos?: File[]
): Promise<void> => {
  const uploadedRecordingId = (
    await axios.post(`/recordings`, { ...recording, expectedPartsCount: recordingParts.length ?? undefined }, {
      headers: { Authorization: `Bearer ${token}` }
    })
  ).data;

  for (const part of recordingParts) {

    const formData = new FormData();
    formData.append('startDate', part.startDate);
    formData.append('endDate', part.endDate);
    formData.append('gpsLatitudeStart', part.gpsLatitudeStart.toString());
    formData.append('gpsLatitudeEnd', part.gpsLatitudeEnd.toString());
    formData.append('gpsLongitudeStart', part.gpsLongitudeStart.toString());
    formData.append('gpsLongitudeEnd', part.gpsLongitudeEnd.toString());
    formData.append('recordingId', uploadedRecordingId.toString());
    formData.append('file', part.data);
    
    await axios.post(
      `/recordings/part-new`,
      formData,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
  }

  for (const photo of photos ?? []) {
    await postPhoto({
      recordingId: uploadedRecordingId,
      format: photo.type,
      photosBase64: toBase64(await photo.arrayBuffer())
    });
  }
};

export const getRecording = async (
  id: Numeric,
  audio = false
): Promise<RecordingModel> => {
  const response = await axios.get(
    `/recordings/${id}?parts=true&sound=${audio}`
  );
  return response.data as RecordingModel;
};

export const patchRecording = async (
  token: string,
  id: Numeric,
  patchedRec: Omit<RecordingUploadReq, 'createdAt'>
): Promise<void> => authorizedPatch(`/recordings/${id}`, token, patchedRec);

// Add deleteRecording and deleteRecordingPart API calls
export const deleteRecording = async (
  token: string,
  id: Numeric
): Promise<void> => authorizedDelete(`/recordings/${id}`, token);

export const deleteRecordingPart = async (
  token: string,
  recordingId: Numeric,
  partId: Numeric
): Promise<void> => authorizedDelete(`/recordings/part/${recordingId}/${partId}`, token);

export const getRecordings = async ({
  audio = false,
  parts = false,
  userId
}: { audio?: boolean; parts?: boolean; userId?: number } = {}): Promise<
  RecordingModel[]
> => {
  const response = await axios.get(
    userId !== undefined
      ? `/recordings?userId=${userId}&parts=${parts}&sound=${audio}`
      : `/recordings?parts=${parts}&sound=${audio}`
  );

  return response.data as RecordingModel[];
};

export const getFilteredRecordings = async (): Promise<FilteredPartModel[]> => {
  const response = await axios.get(`/recordings/filtered`);

  return response.data as FilteredPartModel[];
};

export const getFilteredRecording = async (
  id: Numeric
): Promise<FilteredPartModel[]> => {
  const response = await axios.get(`/recordings/filtered?recordingId=${id}`);
  return response.data as FilteredPartModel[];
};

export const postFilteredPart = async (
  token: string,
  filteredPart: {
    recordingId: number;
    startDate: string;
    endDate: string;
    dialectCode: string;
  }
): Promise<void> => authorizedPost(`/recordings/filtered`, token, filteredPart);

export const patchFilteredPart = async (
  token: string,
  id: Numeric,
  patchedFilteredPart: Omit<FilteredPartModel, 'id'>
): Promise<void> => authorizedPatch(`/recordings/filtered/${id}`, token, patchedFilteredPart);

export const deleteFilteredPart = async (
  token: string,
  id: Numeric
): Promise<void> => authorizedDelete(`/recordings/filtered/${id}`, token);

export const getDialectColors = async (): Promise<Record<string, string>> => {

  // const forNow = [{"id":11,"dialectCode":"Jiné","color":""},{"id":3,"dialectCode":"BC","color":"#FDE441"},{"id":4,"dialectCode":"BE","color":"#52DC4D"},{"id":5,"dialectCode":"BD","color":"#666666"},{"id":6,"dialectCode":"BhBl","color":"#8ED0FF"},{"id":7,"dialectCode":"BlBh","color":"#4E68F0"},{"id":8,"dialectCode":"XB","color":"#F04D4D"},{"id":12,"dialectCode":"Neznámý","color":"#aaaaaa"},{"id":13,"dialectCode":"Bez dialektu","color":"#000000"},{"id":1,"dialectCode":"B","color":"#47f5f2"},{"id":2,"dialectCode":"X","color":"#00ff88"},{"id":9,"dialectCode":"XlB","color":"#e5ff00"},{"id":10,"dialectCode":"XsB","color":"#ffb06b"},{"id":14,"dialectCode":"3S","color":"#030303"},{"id":15,"dialectCode":"BBe","color":"#bbebbe"},{"id":16,"dialectCode":"Nedokončený","color":"#3b4e5f"},{"id":17,"dialectCode":"Unfinished","color":"#3b4e5f"}];

  const response = await axios.get(`${import.meta.env.VITE_API_URL}/recordings/dialects`);
  console.log(response.data)

  const mapping = {};

  for (const dialect of response.data) {
    mapping[dialect.dialectCode] = dialect.color;
  }

  return mapping;
};
