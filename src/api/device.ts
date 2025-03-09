import axios from "axios";
import { ApiError } from "./api-error";
const env = import.meta.env;

export const postDevice = async (deviceRequest: any): Promise<any> => {
	try {
		const response = await axios.post(`${env.VITE_API_URL}/devices/device`, deviceRequest);
		return response.data;

	} catch(e) {
		throw new ApiError((e as any).code, (e as any).response?.status);
	}
};
