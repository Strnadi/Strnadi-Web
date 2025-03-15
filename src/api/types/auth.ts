
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
  nickname: string;
  creationDate: string;
  consent: boolean;
  isEmailVerified: boolean;
  password: string;
  role: "user" | "admin";
  profilePicture: URL | null;
}

export interface LoginRequest {
  email?: string | null;
  password?: string | null;
}

export interface SignUpRequest {
  nickname?: string | null;
  email?: string | null;
  password?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  consent: true;
}

export type Token = string;
