import axios, { type AxiosRequestConfig } from "axios";

export const genericGet = async<T>(endpoint: string): Promise<T> => {
  const response = await axios.get(endpoint);
  return response.data as T;
}

export const authorizedGet = async<T>(endpoint: string, token: string): Promise<T> => {
  const response = await axios.get(endpoint, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return response.data as T;  
}

export const genericPost = async<T, U = undefined>(endpoint: string, data?: U): Promise<T> => {
  const response = await axios.post(endpoint, data);
  return response.data as T;
}

export const authorizedPost = async<T, U = undefined>(endpoint: string, token: string, data?: U, additionalOptions?: AxiosRequestConfig): Promise<T> => {
  const response = await axios.post(endpoint, data, {
    ...additionalOptions,
    headers: {
      ...additionalOptions?.headers,
      'Authorization': `Bearer ${token}`
    }
  });

  return response.data as T;
}

export const genericPut = async<T, U = undefined>(endpoint: string, data?: U): Promise<T> => {
  const response = await axios.put(endpoint, data);
  return response.data;
}

export const authorizedPut = async<T, U = undefined>(endpoint: string, token: string, data?: U): Promise<T> => {
  const response = await axios.put(endpoint, data, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return response.data as T;
}

export const genericPatch = async<T, U = undefined>(endpoint: string, data?: U): Promise<T> => {
  const response = await axios.patch(endpoint, data);
  return response.data;
}

export const authorizedPatch = async<T, U = undefined>(endpoint: string, token: string, data?: U): Promise<T> => {
  const response = await axios.patch(endpoint, data, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return response.data as T;
}

export const genericDelete = async<T>(endpoint: string): Promise<T> => {
  const response = await axios.delete(endpoint);
  return response.data;
}

export const authorizedDelete = async<T>(endpoint: string, token: string): Promise<T> => {
  const response = await axios.delete(endpoint, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return response.data as T;
}
