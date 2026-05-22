import type { ErrorRequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../utils/AppError.js";
import config from "../config/index.js";

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next): void => {
  const statusCode = error instanceof AppError ? error.statusCode : StatusCodes.INTERNAL_SERVER_ERROR;
  const message = error instanceof Error ? error.message : "Something went wrong";
  const errors = error instanceof AppError ? error.errors : undefined;

  if (config.nodeEnv !== "test") {
    console.error(error);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors !== undefined ? { errors } : {}),
  });
};
