import axios from "axios";
import type { JWTPayload } from "jose";

export interface JWTObject extends JWTPayload {
};

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
  role: "user" | "admin";
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
  consent: true;
}

export interface UserUpdateRequest {
  nickname: string;
  firstName: string;
  lastName: string;
  city: string;
  postCode: number;
}

export interface OAuth2SignUpResponse {
  jwt: string;
  firstName: string;
  lastName: string;
}


export type Token = string;


const genericPost = async<T> (path: string, data: T) => {
  const response = await axios.post(`/auth/${path}`, data);
  return response.data;
}

export const getUsers = async (token: string): Promise<User[]> => {
  const response = await axios.get(`/users`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return response.data as User[];  
}

export const getUserInfo = async (token: string, id: number): Promise<User> => {
  const response = await axios.get(`/users/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return response.data as User;  
}

export const getUserId = async (token: string): Promise<number> => {
  const response = await axios.get(`/users/get-id`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return response.data as number;  
}

export const getCurrentUserInfo = async (token: string): Promise<User> => {
  const userId = await getUserId(token);
  return getUserInfo(token, userId);
}

export const postLogin = async (loginData: LoginRequest): Promise<Token> =>
  genericPost("login", loginData);

export const postRegister = async (signUpData: SignUpRequest): Promise<Token> =>
  genericPost("sign-up", signUpData);

export const postGoogleLogin = async (loginInfo: { idToken: string }): Promise<Token> =>
  genericPost("login-google", loginInfo);

export const postGoogleSignup = async (signupInfo: { idToken: string }): Promise<OAuth2SignUpResponse> =>
  genericPost("sign-up-google", signupInfo);

export const getUserExists = async (email: string): Promise<boolean> => {
  const response = await axios.get(`/users/exists?email=${email}`, {
    validateStatus: () => true
  });

  return response.status !== 200;
}

export const patchUser = async (token: string, email: string, data: UserUpdateRequest): Promise<User> => {
  const response = await axios.patch(`/users/${email}`, data, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return response.data;
}

export const getPasswordResetRequest = async (email: string) => {
  await axios.get(`/auth/${email}/reset-password`);
}

export const getResendVerifyEmail = async (email: string) => {
  await axios.get(`/auth/${email}/reset-password`);
}

export const patchPasswordChange = async (token: string, email: string, newPassword: string) => {
  await axios.patch(`/users/${email}/change-password`, { newPassword }, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
}

export const deleteAccount = async (token: string, email: string): Promise<void> => {
  await axios.delete(`/users/${email}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
}
