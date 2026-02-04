import type { Numeric } from '@/types/basic';
import axios from 'axios';
import type { JWTPayload } from 'jose';
import * as jose from 'jose';

export interface JWTObject extends JWTPayload {}

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  nickname: string | null;
  creationDate: string;
  consent: boolean;
  isEmailVerified: boolean;
  password: string;
  role: 'user' | 'admin';
  profilePicture: string | null;
  postCode: number | null;
  city: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignUpRequest {
  postCode: number;
  city: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  nickname: string | null;
  consent: boolean;
  appleId?: string | null;
}

export interface UserUpdateRequest {
  nickname: string;
  firstName: string;
  lastName: string;
  city: string;
  postCode: number;
}

export type OAuth2Token = string;
export interface OAuth2SignUpResponse {
  jwt: string;
  firstName: string | null;
  lastName: string | null;
}

const genericPost = async <T>(path: string, data: T) => {
  const response = await axios.post(`/auth/${path}`, data);
  return response.data;
};

export const getUsers = async (token: string): Promise<User[]> => {
  const response = await axios.get(`/users`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return response.data as User[];
};

export const getUserInfo = async (
  id: Numeric,
  token?: string
): Promise<User> => {
  const response = await axios.get(`/users/${id}`, {
    headers: {
      Authorization: token ? `Bearer ${token}` : undefined
    }
  });

  return response.data as User;
};

export const getUserId = async (token: string): Promise<Numeric> => {
  const response = await axios.get(`/users/get-id`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return response.data as Numeric;
};

export const getCurrentUserInfo = async (token: string): Promise<User> => {
  const userId = await getUserId(token);
  return getUserInfo(userId, token);
};

export const postLogin = async (
  loginData: LoginRequest
): Promise<OAuth2Token> => genericPost('login', loginData);

export const postRegister = async (
  signUpData: SignUpRequest,
  signUpJwt?: string
): Promise<OAuth2Token> => {
  const response = await axios.post(`/auth/sign-up`, signUpData, {
    headers: signUpJwt
      ? {
          Authorization: `Bearer ${signUpJwt}`
        }
      : {}
  });
  return response.data;
};

export const postGoogleLogin = async (loginInfo: {
  idToken: string;
}): Promise<OAuth2Token> => genericPost('login-google', loginInfo);

export const postAppleLogin = async (loginInfo: {
  idToken: string;
  givenName?: string;
  familyName?: string;
}): Promise<OAuth2Token> => {
  const token = jose.decodeJwt(loginInfo.idToken);

  const data = {
    idToken: loginInfo.idToken,
    email: token['email'],
    userIdentifier: token.sub,
    givenName: loginInfo.givenName ?? '',
    familyName: loginInfo.familyName ?? ''
  };

  return genericPost('apple', data);
};

export const postGoogleSignup = async (signupInfo: {
  idToken: string;
}): Promise<OAuth2SignUpResponse> => genericPost('sign-up-google', signupInfo);

export const getUserExists = async (email: string): Promise<boolean> => {
  const response = await axios.get(`/users/exists?email=${email}`, {
    validateStatus: () => true
  });

  return response.status !== 200;
};

export const patchUser = async (
  token: string,
  id: number | string,
  data: UserUpdateRequest
): Promise<User> => {
  const response = await axios.patch(`/users/${id}`, data, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return response.data;
};

export const getPasswordResetRequest = async (email: string) => {
  await axios.get(`/auth/${email}/reset-password`);
};

export const getResendVerifyEmail = async (userId: number) => {
  await axios.get(`/auth/${userId}/resend-verify-email`);
};

export const getRenewedJWT = async (oldJWT: string) => {
  const response = await axios.get(`/auth/renew-jwt`, {
    headers: {
      Authorization: `Bearer ${oldJWT}`
    }
  });

  return response.data as string;
};

export const patchPasswordChange = async (
  token: string,
  id: number | string,
  newPassword: string
) => {
  await axios.patch(
    `/users/${id}/change-password`,
    { newPassword },
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );
};

export const deleteAccount = async (
  token: string,
  userId: string | number
): Promise<void> => {
  await axios.delete(`/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
};
