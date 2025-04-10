import type { PhotoUploadRequest } from "@/api/types/photos";
import axios from "axios";

export const postPhoto = async (uploadRequest: PhotoUploadRequest): Promise<void> => {
	await axios.post(`/photos/recording-photo`, uploadRequest);
};
