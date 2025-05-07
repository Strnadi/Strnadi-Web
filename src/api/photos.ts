import axios from "axios";

export interface PhotoUploadRequest {
  recordingId: number,
  photosBase64: string,
  format: string
};

export const postPhoto = async (uploadRequest: PhotoUploadRequest): Promise<void> => {
	await axios.post(`/photos/recording-photo`, uploadRequest);
};
