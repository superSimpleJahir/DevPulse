import { StatusCodes } from "http-status-codes";
import { AppError } from "./AppError.js";

export const isValidEmail = (email: string): boolean => /^\S+@\S+\.\S+$/.test(email);

export const assertRequiredString = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AppError(StatusCodes.BAD_REQUEST, `${fieldName} is required`);
  }

  return value.trim();
};
