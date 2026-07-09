import { Response } from 'express';

export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    issues?: { field: string; message: string }[];
  };
}

export function sendSuccess<T>(res: Response, data: T, message?: string, statusCode = 200) {
  const body: SuccessResponse<T> = { success: true, data };
  if (message) body.message = message;
  return res.status(statusCode).json(body);
}

export function sendSuccessNoContent(res: Response) {
  return res.status(204).send();
}
