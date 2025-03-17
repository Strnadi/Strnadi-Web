import axios, { AxiosError } from "axios";
import { ApiError } from "./api-error";
import type { RecordingModel, RecordingPartUploadReq, RecordingUploadReq } from "@/api/types/recording";
const env = import.meta.env;

export const postRecording = async (
	token: string,
	recording: RecordingUploadReq,
	recordingParts: RecordingPartUploadReq[]
): Promise<void> => {

	const uploadedRecordingId = (await axios.post(`${env.VITE_API_URL}/recordings/upload`, recording, {
		headers: { "Authorization": `Bearer ${token}` }
	})).data;

	for await (const part of recordingParts) {
		await axios.post(`${env.VITE_API_URL}/recordings/upload-part`, {
			...part,
			recordingId: uploadedRecordingId
		},
		{
			headers: { "Authorization": `Bearer ${token}` }
		});
	}
}

export const getRecordings = async (): Promise<RecordingModel[]> => {
	try {
		const response = await axios.get(`${env.VITE_API_URL}/recordings?parts=true`);

		return response.data as RecordingModel[];
	} catch (e) {
		const error = e as AxiosError;
		throw new ApiError(error.code, error.response?.status);
	}
}

// export const getFilteredRecordings = async (token: string): Promise<RecordingModel[]> => {
// 	try {
// 		const response = await axios.get(`${env.VITE_API_URL}/recordings/filtered`, {
// 			headers: { "Authorization": `Bearer ${token}` }
// 		});

// 		return response.data as RecordingModel[];
// 	} catch (e) {
// 		const error = e as AxiosError;
// 		throw new ApiError(error.code, error.response?.status);
// 	}
// }
