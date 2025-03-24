import axios, { AxiosError } from "axios";
import { ApiError } from "./types/api-error";
import type { RecordingModel, RecordingPartUploadParams, RecordingPartUploadReq, RecordingUploadReq } from "@/api/types/recording";
import { postPhoto } from "./photos";
const env = import.meta.env;

const toBase64 = (content: ArrayBuffer) =>
  btoa(
    new Uint8Array(content).reduce(
      (data, byte) => data + String.fromCharCode(byte),
      ""
    )
  );

export const postRecording = async (
	token: string,
	recording: RecordingUploadReq,
	recordingParts: RecordingPartUploadParams[],
	photos?: File[]
): Promise<void> => {

	const uploadedRecordingId = (await axios.post(`${env.VITE_API_URL}/recordings/upload`, recording, {
		headers: { "Authorization": `Bearer ${token}` }
	})).data;

	for await (const part of recordingParts) {
		await axios.post(`${env.VITE_API_URL}/recordings/upload-part`, {
			startDate: part.startDate,
			endDate: part.endDate,
			gpsLatitudeStart: part.gpsLatitudeStart,
			gpsLatitudeEnd: part.gpsLatitudeEnd,
			gpsLongitudeStart: part.gpsLongitudeStart,
			gpsLongitudeEnd: part.gpsLongitudeEnd,
			recordingId: uploadedRecordingId,
			dataBase64: toBase64(part.data),
		} as RecordingPartUploadReq,
		{
			headers: { "Authorization": `Bearer ${token}` }
		});
	}

	for await (const photo of photos ?? []) {
		await postPhoto({
			recordingId: uploadedRecordingId,
			format: photo.type,
			photosBase64: toBase64(await photo.arrayBuffer()),
		});
	}
}

export const getRecording = async (id: number | string): Promise<RecordingModel> => {
	try {
		const response = await axios.get(`${env.VITE_API_URL}/recordings/${id}?parts=true`);
		return response.data as RecordingModel;
	} catch (e) {
		const error = e as AxiosError;
		throw new ApiError(error.code, error.response?.status);
	}
}

export const getRecordings = async (email?: string): Promise<RecordingModel[]> => {
	try {
		const response = await axios.get(
			(email !== undefined)
				? `${env.VITE_API_URL}/recordings?email=${email}&parts=true`
				: `${env.VITE_API_URL}/recordings?parts=true`,
		);

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
