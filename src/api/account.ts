import axios, { AxiosError } from "axios";
import { LoginRequest, SignUpRequest, Token } from "@/types/api/auth";
import { User } from "@/types/user";
import { ApiError } from "./api-error";

const env = import.meta.env;

const genericPost = async<T> (path: string, data: T) => {
  try {
    const response = await axios.post(`${env.VITE_API_URL}/auth/${path}`, data);
    return response.data;
  } catch(e) {
    const error = e as AxiosError;
    throw new ApiError(error.code, error.response?.status);
  }
}

export const getUser = async (token: string): Promise<User> => {
  try {
    const response = await axios.get(`${env.VITE_API_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  
    return response.data as User;  
  } catch(e) {
    const error = e as AxiosError;
    throw new ApiError(error.code, error.response?.status);
  }
};

export const postLogin = async (loginData: LoginRequest): Promise<Token> =>
  genericPost("login", loginData);

export const postRegister = async (signUpData: SignUpRequest): Promise<Token> =>
  genericPost("register", signUpData);
