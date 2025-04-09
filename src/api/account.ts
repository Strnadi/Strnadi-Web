import axios, { AxiosError } from "axios";
import { ApiError } from "./types/api-error";
import type { JWTObject, User } from "./types/auth";
import type { LoginRequest, SignUpRequest, Token } from "@/api/types/auth";
import type { OAuth2SignUpResponse } from "./types/oauth2";

const genericPost = async<T> (path: string, data: T) => {
  try {
    const response = await axios.post(`/auth/${path}`, data);
    return response.data;
  } catch(e) {
    const error = e as AxiosError;
    throw new ApiError(error.code, error.response?.status);
  }
}

export const getUserInfo = async (token: string, email: string): Promise<User> => {
  try {
    const response = await axios.get(`/users/${email}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    return response.data as User;  
  } catch(e) {
    const error = e as AxiosError;
    throw new ApiError(error.code, error.response?.status);
  }
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
  try {
    const response = await axios.get(`/users/exists?email=${email}`, {
      validateStatus: () => true
    });

    return response.status !== 200;
  } catch(e) {
    const error = e as AxiosError;
    throw new ApiError(error.code, error.response?.status);
  }
}

export const deleteAccount = async (token: string, email: string): Promise<void> => {
  try {
    await axios.delete(`/users/${email}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  } catch(e) {
    const error = e as AxiosError;
    throw new ApiError(error.code, error.response?.status);
  }
}
