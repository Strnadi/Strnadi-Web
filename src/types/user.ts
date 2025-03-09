
export interface User {
  id: number,
  email: string,
  firstName: string,
  lastName: string,
  nickname: string,
  creationDate: string,
  consent: boolean,
  isEmailVerified: boolean,
  password: string,
  role: "user" | "admin",
  profilePicture: URL | null
};
