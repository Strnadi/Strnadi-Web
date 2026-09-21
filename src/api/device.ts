import { authorizedDelete, authorizedPatch, authorizedPost } from './utils';

/** Tenant `AddDeviceRequest`. */
export interface AddDeviceRequest {
  userId: string;
  fcmToken: string;
  devicePlatform: string;
  deviceModel: string;
}

/** Tenant `UpdateDeviceRequest` - re-points a registration at a rotated token. */
export interface UpdateDeviceRequest {
  oldFcmToken: string;
  newFcmToken: string;
}

export const postDevice = async (
  addRequest: AddDeviceRequest,
  token: string
): Promise<void> =>
  authorizedPost<void, AddDeviceRequest>('/devices/add', token, addRequest);

/**
 * FCM rotates registration tokens on its own; patching keeps the existing
 * device row instead of orphaning it and adding a second one.
 */
export const patchDevice = async (
  updateRequest: UpdateDeviceRequest,
  token: string
): Promise<void> =>
  authorizedPatch<void, UpdateDeviceRequest>(
    '/devices/update',
    token,
    updateRequest
  );

export const postDeleteDevice = async (
  fcmToken: string,
  token: string
): Promise<void> =>
  authorizedDelete(`/devices/delete/${encodeURIComponent(fcmToken)}`, token);
