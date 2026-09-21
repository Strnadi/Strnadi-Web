import axios, { type AxiosRequestConfig } from 'axios';

const bearer = (token: string, config?: AxiosRequestConfig) => ({
  ...config,
  headers: {
    ...config?.headers,
    Authorization: `Bearer ${token}`
  }
});

export const genericGet = async <T>(endpoint: string): Promise<T> => {
  const response = await axios.get<T>(endpoint);
  return response.data;
};

export const authorizedGet = async <T>(
  endpoint: string,
  token: string,
  config?: AxiosRequestConfig
): Promise<T> => {
  const response = await axios.get<T>(endpoint, bearer(token, config));
  return response.data;
};

export const authorizedPost = async <T, U = undefined>(
  endpoint: string,
  token: string,
  data?: U,
  config?: AxiosRequestConfig
): Promise<T> => {
  const response = await axios.post<T>(endpoint, data, bearer(token, config));
  return response.data;
};

export const authorizedPatch = async <T, U = undefined>(
  endpoint: string,
  token: string,
  data?: U,
  headers?: Record<string, string>
): Promise<T> => {
  const response = await axios.patch<T>(endpoint, data, bearer(token, { headers }));
  return response.data;
};

export const authorizedDelete = async <T>(
  endpoint: string,
  token: string
): Promise<T> => {
  const response = await axios.delete<T>(endpoint, bearer(token));
  return response.data;
};
