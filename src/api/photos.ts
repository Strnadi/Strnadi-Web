import type { PhotoUploadRequest } from "@/api/types/photos";
import { ApiError } from "@/api/types/api-error";
import axios from "axios";

const env = import.meta.env;

export const postPhoto = async (uploadRequest: PhotoUploadRequest): Promise<void> => {
	try {
		await axios.post(`/photos/recording-photo`, uploadRequest);
	} catch(e) {
		throw new ApiError((e as any).code, (e as any).response?.status);
	}
};
