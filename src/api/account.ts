import axios, { type AxiosRequestConfig } from 'axios';
import type { JWTPayload } from 'jose';
import { authorizationConfig } from '@/api/auth';
import { extensionToMime } from '@/utils/files';

export interface JWTObject extends JWTPayload {
  /** Project-scoped role names, from the token-exchange grant. */
  role?: string | string[];
  /** Project-scoped permissions, one claim per granted permission. */
  permission?: string | string[];
  project_id?: string;
}

/** Administration `UserProfileResponse` - the caller's own profile. */
export interface UserProfile {
  id: string;
  userName: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  city: string | null;
  postCode: number | null;
  /** Role names the caller holds in the project the token is scoped to. */
  roles: string[];
}

/** Administration `UpdateProfileRequest`. */
export interface UpdateProfileRequest {
  userName: string | null;
  firstName: string;
  lastName: string;
  city: string | null;
  postCode: number | null;
}

/** Administration `UserBasicResponse` - what `users.view.basic` may see. */
export interface UserBasic {
  id: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  deleted: boolean;
  legacy: boolean;
  emailConfirmed: boolean;
}

/**
 * Administration `UserConfidentialResponse` - what `users.view.confidential`
 * (or `users.manage`) may see. The directory endpoints return whichever shape
 * the caller's permissions allow, so the extra fields are optional here.
 */
export interface UserDirectoryEntry extends UserBasic {
  email?: string | null;
  city?: string | null;
  postCode?: number | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ProfilePhoto {
  format: string;
  photoBase64: string;
}

const administrationUrl = (path: string): string =>
  `${authorizationConfig.baseUrl}${path}`;

/**
 * Administration endpoints validate the identity token issued by
 * /connect/token - never the project-scoped token, which is audience-bound to
 * the Tenant API.
 */
const identityRequest = (
  identityToken: string,
  config?: AxiosRequestConfig
): AxiosRequestConfig => ({
  ...config,
  headers: {
    ...config?.headers,
    Authorization: `Bearer ${identityToken}`
  }
});

export const getCurrentUserInfo = async (
  identityToken: string
): Promise<UserProfile> => {
  const response = await axios.get<UserProfile>(
    administrationUrl('/account/profile'),
    identityRequest(identityToken)
  );
  return response.data;
};

export const patchUser = async (
  identityToken: string,
  data: UpdateProfileRequest
): Promise<UserProfile> => {
  const response = await axios.patch<UserProfile>(
    administrationUrl('/account/profile'),
    data,
    identityRequest(identityToken)
  );
  return response.data;
};

export const getPasswordResetRequest = async (email: string): Promise<void> => {
  await axios.post(administrationUrl('/account/forgot-password'), { email });
};

export const getResendVerifyEmail = async (email: string): Promise<void> => {
  await axios.post(administrationUrl('/account/resend-confirmation-email'), {
    email
  });
};

export const getExternalLogins = async (
  identityToken: string
): Promise<string[]> => {
  const response = await axios.get<string[]>(
    administrationUrl('/account/external-logins'),
    identityRequest(identityToken)
  );
  return response.data;
};

export const getExternalLoginUrl = (
  provider: 'Google' | 'Apple',
  returnUrl = '/dashboard'
): string => {
  const url = new URL(administrationUrl(`/account/external-login/${provider}`));
  url.searchParams.set('returnUrl', returnUrl);
  return url.toString();
};

export const uploadProfilePhoto = async (
  identityToken: string,
  file: File
): Promise<void> => {
  const photoBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new Error('Profilovou fotku se nepodařilo načíst.'));
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.readAsDataURL(file);
  });
  const extension = file.name.split('.').pop()?.toLowerCase();
  const format = extension || file.type.split('/').pop() || 'jpg';

  await axios.post(
    administrationUrl('/account/profile-photo'),
    { format, photoBase64 },
    identityRequest(identityToken)
  );
};

/** A user's profile photo, or null when they have not set one. */
export const getProfilePhoto = async (
  userId: string
): Promise<ProfilePhoto | null> => {
  try {
    const response = await axios.get<ProfilePhoto>(
      administrationUrl(`/users/${encodeURIComponent(userId)}/profile-photo`)
    );
    return response.data;
  } catch {
    return null;
  }
};

export const profilePhotoDataUrl = (photo: ProfilePhoto): string => {
  const format = photo.format;
  const extension = format.startsWith('.') ? format : `.${format}`;
  const mime = format.includes('/')
    ? format
    : extensionToMime[extension.toLowerCase()] || 'image/jpeg';
  return `data:${mime};base64,${photo.photoBase64}`;
};

export const patchPasswordChange = async (
  identityToken: string,
  newPassword: string,
  currentPassword: string
): Promise<void> => {
  const request: ChangePasswordRequest = { currentPassword, newPassword };
  await axios.post(
    administrationUrl('/account/change-password'),
    request,
    identityRequest(identityToken)
  );
};

export const logout = async (identityToken: string): Promise<void> => {
  await axios.post(
    administrationUrl('/account/logout'),
    undefined,
    identityRequest(identityToken)
  );
};

export const deleteAccount = async (identityToken: string): Promise<void> => {
  await axios.delete(
    administrationUrl('/account'),
    identityRequest(identityToken)
  );
};

/**
 * The user directory. Requires `users.view.basic` at minimum; callers with
 * `users.view.confidential` or `users.manage` also get email/city/postCode.
 */
export const getUsers = async (
  identityToken: string
): Promise<UserDirectoryEntry[]> => {
  const response = await axios.get<UserDirectoryEntry[]>(
    administrationUrl('/users'),
    identityRequest(identityToken)
  );
  return response.data;
};

export const getUser = async (
  identityToken: string,
  userId: string
): Promise<UserDirectoryEntry> => {
  const response = await axios.get<UserDirectoryEntry>(
    administrationUrl(`/users/${encodeURIComponent(userId)}`),
    identityRequest(identityToken)
  );
  return response.data;
};
