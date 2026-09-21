import axios from 'axios';
import { authorizedDelete, authorizedPost } from './utils';
import { extensionToMime } from '@/utils/files';
import type { Numeric } from '@/types/basic';

/** Tenant `RecordingPhotoModel`. */
export interface RecordingPhoto {
  id: number;
  format: string;
  photoBase64: string;
}

/** Tenant `UploadRecordingPhotoRequest`. */
export interface UploadRecordingPhotoRequest {
  format: string;
  photoBase64: string;
}

export const getRecordingPhotos = async (
  recordingId: Numeric
): Promise<RecordingPhoto[]> => {
  const response = await axios.get<RecordingPhoto[]>(
    `/recordings/${recordingId}/photos`
  );
  return response.data;
};

/** Only the recording's owner, or a moderator, may attach a photo. */
export const postRecordingPhoto = async (
  token: string,
  recordingId: Numeric,
  request: UploadRecordingPhotoRequest
): Promise<number> =>
  authorizedPost<number, UploadRecordingPhotoRequest>(
    `/recordings/${recordingId}/photos`,
    token,
    request
  );

export const deleteRecordingPhoto = async (
  token: string,
  recordingId: Numeric,
  photoId: Numeric
): Promise<void> =>
  authorizedDelete(`/recordings/${recordingId}/photos/${photoId}`, token);

export const recordingPhotoDataUrl = (photo: RecordingPhoto): string => {
  const format = photo.format || 'jpg';
  const extension = format.startsWith('.') ? format : `.${format}`;
  const mime = format.includes('/')
    ? format
    : extensionToMime[extension.toLowerCase()] || 'image/jpeg';
  return `data:${mime};base64,${photo.photoBase64}`;
};

const toBase64 = (content: ArrayBuffer): string => {
  const bytes = new Uint8Array(content);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
};

export const fileToUploadRequest = async (
  file: File
): Promise<UploadRecordingPhotoRequest> => ({
  format: file.name.split('.').pop()?.toLowerCase() || file.type || 'jpg',
  photoBase64: toBase64(await file.arrayBuffer())
});
