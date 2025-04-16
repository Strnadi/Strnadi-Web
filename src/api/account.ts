import axios from "axios";
import type { JWTObject, User, UserUpdateRequest } from "./types/auth";
import type { LoginRequest, SignUpRequest, Token } from "@/api/types/auth";
import type { OAuth2SignUpResponse } from "./types/oauth2";

const genericPost = async<T> (path: string, data: T) => {
  const response = await axios.post(`/auth/${path}`, data);
  return response.data;
}

export const getUserInfo = async (token: string, email: string): Promise<User> => {
  const response = await axios.get(`/users/${email}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return response.data as User;  
}

export const getCurrentUserInfo = async (token: string, token_object: JWTObject): Promise<User> =>
  getUserInfo(token, token_object.sub!);

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
