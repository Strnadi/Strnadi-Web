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
}

export type Token = string;
