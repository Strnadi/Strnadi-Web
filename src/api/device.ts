import axios from "axios";
import { ApiError } from "./types/api-error";
import type { AddDeviceRequest, UpdateDeviceRequest } from "./types/device";

export const postDevice = async (addRequest: AddDeviceRequest, token: string): Promise<void> => {
	try {
		await axios.post(`/devices/add`, addRequest, {
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
		await axios.patch(`/devices/update`, updateRequest, {
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
		await axios.delete(`/devices/delete/${fcmToken}`, {
			headers: {
				Authorization: `Bearer ${token}`
			}
		});
	} catch(e) {
		throw new ApiError((e as any).code, (e as any).response?.status);
	}
};
