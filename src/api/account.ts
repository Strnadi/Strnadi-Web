import axios, { AxiosError } from "axios";
import { LoginRequest, SignUpRequest, Token } from "@/types/api/auth";
import { User } from "@/types/user";
import { ApiError } from "./api-error";

const env = import.meta.env;

export const getUser = async (token: string): Promise<User> => {
  try {
    const response = await axios.get(`${env.VITE_API_URL}/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  
    return response.data as User;  
  } catch(e) {
    const error = e as AxiosError;
    throw new ApiError(error.code, error.response?.status);
  }
};

export const postLogin = async (loginData: LoginRequest): Promise<Token> => {
  try {
    const response = await axios.post(`${env.VITE_API_URL}/auth/login`, loginData);
    return response.data;
  } catch(e) {
    const error = e as AxiosError;
    throw new ApiError(error.code, error.response?.status);
  }
};

export const postRegister = async (signUpData: SignUpRequest): Promise<Token> => {
  try {
    const response = await axios.post(`${env.VITE_API_URL}/auth/sign-up`, signUpData);
    return response.data;
  } catch(e) {
    const error = e as AxiosError;
    throw new ApiError(error.code, error.response?.status);
  }
};

