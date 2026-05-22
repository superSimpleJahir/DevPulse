import type { Response } from "express";

type SuccessPayload<T> = {
  statusCode: number;
  message?: string;
  data?: T;
};

export const sendResponse = <T>(res: Response, payload: SuccessPayload<T>): void => {
  const responseBody: {
    success: true;
    message?: string;
    data?: T;
  } = {
    success: true,
  };

  if (payload.message) {
    responseBody.message = payload.message;
  }

  if (payload.data !== undefined) {
    responseBody.data = payload.data;
  }

  res.status(payload.statusCode).json(responseBody);
};
