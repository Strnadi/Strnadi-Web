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
  profilePicture: URL;
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

export type Token = string;
