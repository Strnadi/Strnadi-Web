import axios from "axios";
import type { RecordingModel, RecordingPartUploadParams, RecordingPartUploadReq, RecordingUploadReq } from "@/api/types/recording";
import { postPhoto } from "./photos";

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

	const uploadedRecordingId = (await axios.post(`/recordings/upload`, recording, {
		headers: { "Authorization": `Bearer ${token}` }
	})).data;

	for await (const part of recordingParts) {
		await axios.post(`/recordings/upload-part`, {
			startDate: part.startDate,
			endDate: part.endDate,
			gpsLatitudeStart: part.gpsLatitudeStart,
			gpsLatitudeEnd: part.gpsLatitudeEnd,
			gpsLongitudeStart: part.gpsLongitudeStart,
			gpsLongitudeEnd: part.gpsLongitudeEnd,
			recordingId: uploadedRecordingId,
			dataBase64: toBase64(await part.data.arrayBuffer()),
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

export const getRecording = async (id: number | string, audio = false): Promise<RecordingModel> => {
	const response = await axios.get(`/recordings/${id}?parts=true&sound=${audio}`);
	return response.data as RecordingModel;
}

export const getRecordings = async (
	{ audio = false, email }: { audio?: boolean, email?: string } = {}
): Promise<RecordingModel[]> => {
	const response = await axios.get(
		(email !== undefined)
			? `/recordings?email=${email}&parts=true&sound=${audio ?? false}`
			: `/recordings?parts=true&sound=${audio ?? false}`,
	);

	return response.data as RecordingModel[];
}

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
