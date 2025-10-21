import axios from 'axios';
import { postPhoto } from './photos';
import { authorizedPatch } from './utils';
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
  userGuessDialect: string | null;
  confirmedDialect: string | null;
  filteredRecordingPartId: number;
}

export interface FilteredPartModel {
  id: number;
  startDate: string;
  endDate: string;
  state: number;
  recordingId: number;
  detectedDialects: DetectedDialect[] | null;
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
    await axios.post(`/recordings`, recording, {
      headers: { Authorization: `Bearer ${token}` }
    })
  ).data;

  for await (const part of recordingParts) {
    await axios.post(
      `/recordings/part`,
      {
        startDate: part.startDate,
        endDate: part.endDate,
        gpsLatitudeStart: part.gpsLatitudeStart,
        gpsLatitudeEnd: part.gpsLatitudeEnd,
        gpsLongitudeStart: part.gpsLongitudeStart,
        gpsLongitudeEnd: part.gpsLongitudeEnd,
        recordingId: uploadedRecordingId,
        dataBase64: toBase64(await part.data.arrayBuffer())
      } as RecordingPartUploadReq,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
  }

  for await (const photo of photos ?? []) {
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

// export const getFilteredRecordings = async (token: string): Promise<RecordingModel[]> => {
// 	try {
// 		const response = await axios.get(`/recordings/filtered`, {
// 			headers: { "Authorization": `Bearer ${token}` }
// 		});

// 		return response.data as RecordingModel[];
// 	} catch (e) {
// 		const error = e as AxiosError;
// 		throw new ApiError(error.code, error.response?.status);
// 	}
// }
