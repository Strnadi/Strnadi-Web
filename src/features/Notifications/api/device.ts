import axios from "axios";

export interface AddDeviceRequest {
  userId: number,
  fcmToken: string,
  devicePlatform: string,
  deviceModel: string
};

export const postDevice = async (addRequest: AddDeviceRequest, token: string): Promise<void> => {
	await axios.post(`/devices/add`, addRequest, {
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
