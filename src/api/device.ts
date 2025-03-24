import axios from "axios";
import { ApiError } from "./types/api-error";
import type { AddDeviceRequest, UpdateDeviceRequest } from "./types/device";
const env = import.meta.env;

export const postDevice = async (addRequest: AddDeviceRequest, token: string): Promise<void> => {
	try {
		await axios.post(`${env.VITE_API_URL}/devices/add`, addRequest, {
			headers: {
				Authorization: `Bearer ${token}`
			}
		});
	} catch(e) {
		throw new ApiError((e as any).code, (e as any).response?.status);
	}
};

export const postUpdateDevice = async (updateRequest: UpdateDeviceRequest, token: string): Promise<void> => {
	try {
		await axios.patch(`${env.VITE_API_URL}/devices/update`, updateRequest, {
			headers: {
				Authorization: `Bearer ${token}`
			}
		});
	} catch(e) {
		throw new ApiError((e as any).code, (e as any).response?.status);
	}
}

export const postDeleteDevice = async (fcmToken: string, token: string): Promise<void> => {
	try {
		await axios.delete(`${env.VITE_API_URL}/devices/delete/${fcmToken}`, {
			headers: {
				Authorization: `Bearer ${token}`
			}
		});
	} catch(e) {
		throw new ApiError((e as any).code, (e as any).response?.status);
	}
};
