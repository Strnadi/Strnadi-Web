
export interface JwtObject {
  sub: string,
  iss: string,
  aud: string,
  nbf: number,
  exp: number,
  iat: number
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
  postalCode: string | null;
  city: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignUpRequest {
  postCode: string;
  city: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  nickname: string | null;
  consent: true;
}

export type Token = string;
