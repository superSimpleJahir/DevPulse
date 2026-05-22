import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import type { StringValue } from "ms";
import { pool } from "../../db/index.js";
import config from "../../config/index.js";
import { AppError } from "../../utils/AppError.js";
import { assertRequiredString, isValidEmail } from "../../utils/validation.js";
import type { LoginPayload, SafeUser, SignupPayload, UserRole, UserRow } from "./auth.interface.js";

const sanitizeUser = (user: UserRow): SafeUser => {
  const { password: _password, ...safeUser } = user;
  return safeUser;
};

const validateRole = (role: unknown): UserRole => {
  if (role === undefined) {
    return "contributor";
  }

  if (role !== "contributor" && role !== "maintainer") {
    throw new AppError(StatusCodes.BAD_REQUEST, "Role must be contributor or maintainer");
  }

  return role;
};

const signup = async (payload: SignupPayload): Promise<SafeUser> => {
  const name = assertRequiredString(payload.name, "Name");
  const email = assertRequiredString(payload.email, "Email").toLowerCase();
  const password = assertRequiredString(payload.password, "Password");
  const role = validateRole(payload.role);

  if (!isValidEmail(email)) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Email must be valid");
  }

  if (password.length < 6) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Password must be at least 6 characters long");
  }

  const existingUser = await pool.query<UserRow>("SELECT * FROM users WHERE email = $1", [email]);

  if ((existingUser.rowCount ?? 0) > 0) {
    throw new AppError(StatusCodes.BAD_REQUEST, "User with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await pool.query<UserRow>(
    `INSERT INTO users (name, email, password, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, password, role, created_at, updated_at`,
    [name, email, hashedPassword, role],
  );

  const user = result.rows[0];

  if (!user) {
    throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "User registration failed");
  }

  return sanitizeUser(user);
};

const login = async (payload: LoginPayload): Promise<{ token: string; user: SafeUser }> => {
  const email = assertRequiredString(payload.email, "Email").toLowerCase();
  const password = assertRequiredString(payload.password, "Password");

  const result = await pool.query<UserRow>("SELECT * FROM users WHERE email = $1", [email]);
  const user = result.rows[0];

  if (!user) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Invalid email or password");
  }

  const passwordMatched = await bcrypt.compare(password, user.password);

  if (!passwordMatched) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Invalid email or password");
  }

  const token = jwt.sign(
    {
      id: user.id,
      name: user.name,
      role: user.role,
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiresIn as StringValue,
    },
  );

  return {
    token,
    user: sanitizeUser(user),
  };
};

export const authService = {
  signup,
  login,
};
