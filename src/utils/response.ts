import { Response } from 'express';
import { HTTP_STATUS } from '../constants';
import type { ApiResponse, PaginationMeta, ValidationError } from '../types';

export function sendSuccess<T>(
  res: Response,
  data?: T,
  message = 'Operation successful',
  statusCode = HTTP_STATUS.OK,
  meta?: PaginationMeta,
): Response {
  const response: ApiResponse<T> = {
    success: true,
    message,
    ...(data !== undefined ? { data } : {}),
    ...(meta ? { meta } : {}),
  };
  return res.status(statusCode).json(response);
}

export function sendCreated<T>(res: Response, data?: T, message = 'Resource created'): Response {
  return sendSuccess(res, data, message, HTTP_STATUS.CREATED);
}

export function sendNoContent(res: Response): Response {
  return res.status(HTTP_STATUS.NO_CONTENT).send();
}

export function sendError(
  res: Response,
  message = 'Something went wrong',
  statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  errors?: ValidationError[],
): Response {
  const response: ApiResponse = {
    success: false,
    message,
    ...(errors?.length ? { errors } : {}),
  };
  return res.status(statusCode).json(response);
}

export function sendNotFound(res: Response, message = 'Resource not found'): Response {
  return sendError(res, message, HTTP_STATUS.NOT_FOUND);
}

export function sendUnauthorized(res: Response, message = 'Unauthorized'): Response {
  return sendError(res, message, HTTP_STATUS.UNAUTHORIZED);
}

export function sendForbidden(res: Response, message = 'Access denied'): Response {
  return sendError(res, message, HTTP_STATUS.FORBIDDEN);
}

export function sendBadRequest(
  res: Response,
  message = 'Bad request',
  errors?: ValidationError[],
): Response {
  return sendError(res, message, HTTP_STATUS.BAD_REQUEST, errors);
}

export function sendConflict(res: Response, message = 'Resource already exists'): Response {
  return sendError(res, message, HTTP_STATUS.CONFLICT);
}

export function sendValidationError(res: Response, errors: ValidationError[]): Response {
  return sendError(res, 'Validation failed', HTTP_STATUS.UNPROCESSABLE_ENTITY, errors);
}
