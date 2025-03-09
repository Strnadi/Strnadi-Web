import axios from "axios";
import { ApiError } from "./api-error";
const env = import.meta.env;

export const postRecording = async (recordingUploadReq: any): Promise<any> => {
	try {
		const response = await axios.post(`${env.VITE_API_URL}/recordings/upload`, recordingUploadReq);
		return response.data;

	} catch(e) {
		throw new ApiError((e as any).code, (e as any).response?.status);
	}
};

export const getRecordings = async (token: string): Promise<any> => {
	try {
		const response = await axios.get(`${env.VITE_API_URL}/recordings`, {
			headers: { Authorization: `Bearer ${token}` }
		});

		return response.data;
	} catch(e) {
		throw new ApiError((e as any).code, (e as any).response?.status);
	}
};

export const getFilteredRecordings = async (token: string): Promise<any> => {
	try {
		const response = await axios.get(`${env.VITE_API_URL}/recordings/filtered`, {
			headers: { Authorization: `Bearer ${token}` }
		});

		return response.data;
	} catch(e) {
		throw new ApiError((e as any).code, (e as any).response?.status);
	}
};
