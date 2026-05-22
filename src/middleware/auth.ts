import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import config from "../config/index.js";
import { AppError } from "../utils/AppError.js";
import type { UserRole } from "../modules/auth/auth.interface.js";

type TokenPayload = JwtPayload & {
  id: number;
  name: string;
  role: UserRole;
};

const isTokenPayload = (payload: string | JwtPayload): payload is TokenPayload => {
  if (typeof payload === "string") {
    return false;
  }

  return (
    typeof payload.id === "number" &&
    typeof payload.name === "string" &&
    (payload.role === "contributor" || payload.role === "maintainer")
  );
};

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "Authorization token is required");
  }

  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : authorization;

  try {
    const decoded = jwt.verify(token, config.jwtSecret);

    if (!isTokenPayload(decoded)) {
      throw new AppError(StatusCodes.UNAUTHORIZED, "Invalid token payload");
    }

    req.user = {
      id: decoded.id,
      name: decoded.name,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(StatusCodes.UNAUTHORIZED, "Invalid or expired token");
  }
};

export const requireRole =
  (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(StatusCodes.UNAUTHORIZED, "Authentication required");
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError(StatusCodes.FORBIDDEN, "You do not have permission to perform this action");
    }

    next();
  };
