import axios from "axios";
import type { AddDeviceRequest, UpdateDeviceRequest } from "./types/device";

export const postDevice = async (addRequest: AddDeviceRequest, token: string): Promise<void> => {
	await axios.post(`/devices/add`, addRequest, {
		headers: {
			Authorization: `Bearer ${token}`
		}
	});
};

export const postUpdateDevice = async (updateRequest: UpdateDeviceRequest, token: string): Promise<void> => {
	await axios.patch(`/devices/update`, updateRequest, {
		headers: {
			Authorization: `Bearer ${token}`
		}
	});
};

export const postDeleteDevice = async (fcmToken: string, token: string): Promise<void> => {
	await axios.delete(`/devices/delete/${fcmToken}`, {
		headers: {
			Authorization: `Bearer ${token}`
		}
	});
};
