export interface UpdateDeviceRequest {
  oldToken?: string | null;
  newToken?: string | null;
}

export interface AddDeviceRequest {
  userEmail: string,
  fcmToken: string,
  devicePlatform: string,
  deviceModel: string
};
