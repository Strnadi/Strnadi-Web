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
  filteredRecordingPartId: number;
  userGuessDialectId?: number | null;
  confirmedDialectId?: number | null;
  predictedDialectId?: number | null;
  userGuessDialect?: string | null;
  confirmedDialect?: string | null;
  predictedDialect?: string | null;
}

export interface FilteredPartModel {
  id: number;
  parentId: number;
  startDate: string;
  endDate: string;
  state: number;
  recordingId: number;
  detectedDialects: DetectedDialect[] | null;
  representantFlag?: boolean;
  // representant?: boolean;
}

export interface DialectDefinition {
  id: number;
  dialectCode: string;
  color: string;
}

export interface UpdateDetectedDialectPayload {
  id: Numeric;
  userGuessDialectId?: number | null;
  confirmedDialectId?: number | null;
  predictedDialectId?: number | null;
}

export interface DetectedDialectUploadRequest {
  filteredPartId: number;
  userGuessDialectId?: number | null;
  confirmedDialectId?: number | null;
  predictedDialectId?: number | null;
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
): Promise<number> => {
  const uploadedRecordingId = (
    await axios.post(
      `/recordings`,
      { ...recording, expectedPartsCount: recordingParts.length ?? undefined },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    )
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

    await axios.post(`/recordings/part-new`, formData, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  for (const photo of photos ?? []) {
    await postPhoto({
      recordingId: uploadedRecordingId,
      format: photo.type,
      photosBase64: toBase64(await photo.arrayBuffer())
    });
  }

  return uploadedRecordingId;
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
): Promise<void> =>
  authorizedDelete(`/recordings/part/${recordingId}/${partId}`, token);

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
): Promise<void> =>
  authorizedPost(`/recordings/filtered`, token, filteredPart);

export const patchFilteredPart = async (
  token: string,
  id: Numeric,
  patchedFilteredPart: Omit<FilteredPartModel, 'id' | 'detectedDialects'>
): Promise<void> =>
  authorizedPatch(`/recordings/filtered/${id}`, token, patchedFilteredPart);

export const deleteFilteredPart = async (
  token: string,
  id: Numeric
): Promise<void> => authorizedDelete(`/recordings/filtered/${id}`, token);

export const getDialects = async (): Promise<DialectDefinition[]> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_URL}/recordings/dialects`
  );
  return response.data as DialectDefinition[];
};

export const getDialectColors = async (): Promise<Record<string, string>> => {
  const dialects = await getDialects();
  return dialects.reduce<Record<string, string>>((acc, dialect) => {
    acc[dialect.dialectCode] = dialect.color;
    return acc;
  }, {});
};

export const updateDetectedDialect = async (
  token: string,
  payload: UpdateDetectedDialectPayload
): Promise<void> =>
  authorizedPatch(`/recordings/filtered/detected`, token, payload);

export const postDetectedDialect = async (
  token: string,
  payload: DetectedDialectUploadRequest
): Promise<void> =>
  authorizedPost(`/recordings/filtered/detected`, token, payload);

export const deleteDetectedDialect = async (
  token: string,
  id: Numeric
): Promise<void> =>
  authorizedDelete(`/recordings/filtered/detected/${id}`, token);
