export type UserRole = "contributor" | "maintainer";

export type UserRow = {
  id: number;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
};

export type SafeUser = Omit<UserRow, "password">;

export type SignupPayload = {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
};

export type LoginPayload = {
  email: string;
  password: string;
};
