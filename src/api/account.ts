import axios from 'axios';
import type { JWTPayload } from 'jose';
import { authorizationConfig } from '@/api/auth';

export interface JWTObject extends JWTPayload {}

export interface UserProfileResponse {
  id: string;
  userName: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  city: string | null;
  postCode: number | null;
  roles: string[];
}

/**
 * Account model used by the existing UI. The compatibility fields can be
 * removed once the remaining Tenant v1 administration screens are migrated.
 */
export interface User extends UserProfileResponse {
  nickname: string | null;
  role: 'user' | 'admin';
  isEmailVerified: boolean | null;
  profilePicture: null;
}

export interface UserUpdateRequest {
  nickname: string;
  firstName: string;
  lastName: string;
  city: string | null;
  postCode: number | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

const administrationUrl = (path: string): string =>
  `${authorizationConfig.baseUrl}${path}`;

const bearerHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`
});

const toUser = (profile: UserProfileResponse): User => ({
  ...profile,
  nickname: profile.userName,
  role: profile.roles.some((role) => role.toLowerCase() === 'admin')
    ? 'admin'
    : 'user',
  // The new profile response intentionally does not expose confirmation state.
  isEmailVerified: null,
  profilePicture: null
});

export const getCurrentUserInfo = async (token: string): Promise<User> => {
  const response = await axios.get<UserProfileResponse>(
    administrationUrl('/account/profile'),
    { headers: bearerHeaders(token) }
  );
  return toUser(response.data);
};

export const patchUser = async (
  token: string,
  _id: string | number,
  data: UserUpdateRequest
): Promise<User> => {
  const response = await axios.patch<UserProfileResponse>(
    administrationUrl('/account/profile'),
    {
      userName: data.nickname || null,
      firstName: data.firstName,
      lastName: data.lastName,
      city: data.city || null,
      postCode: data.postCode
    },
    { headers: bearerHeaders(token) }
  );
  return toUser(response.data);
};

export const getPasswordResetRequest = async (email: string): Promise<void> => {
  await axios.post(administrationUrl('/account/forgot-password'), { email });
};

export const getResendVerifyEmail = async (email: string): Promise<void> => {
  await axios.post(administrationUrl('/account/resend-confirmation-email'), {
    email
  });
};

export const getExternalLogins = async (token: string): Promise<string[]> => {
  const response = await axios.get<string[]>(
    administrationUrl('/account/external-logins'),
    { headers: bearerHeaders(token) }
  );
  return response.data;
};

export const getExternalLoginUrl = (provider: 'Google' | 'Apple'): string => {
  const url = new URL(administrationUrl(`/account/external-login/${provider}`));
  url.searchParams.set('returnUrl', '/dashboard');
  return url.toString();
};

export const uploadProfilePhoto = async (
  token: string,
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
    { headers: bearerHeaders(token) }
  );
};

export const patchPasswordChange = async (
  token: string,
  _id: string | number,
  newPassword: string,
  currentPassword: string
): Promise<void> => {
  const request: ChangePasswordRequest = { currentPassword, newPassword };
  await axios.post(administrationUrl('/account/change-password'), request, {
    headers: bearerHeaders(token)
  });
};

export const deleteAccount = async (
  token: string,
  _userId: string | number
): Promise<void> => {
  await axios.delete(administrationUrl('/account'), {
    headers: bearerHeaders(token)
  });
};

// Administration v2 currently exposes only the caller's profile. This export
// remains while the notification-recipient picker still needs a directory API.
export const getUsers = async (_token: string): Promise<User[]> => {
  throw new Error('Administration API v2 zatím neposkytuje seznam uživatelů.');
};
