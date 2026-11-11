import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';

export const notFoundHandler = (req, _res, next) =>
  next(new AppError(404, 'ROUTE_NOT_FOUND', `Route not found: ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, _next) => {
  let status = err.status || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Something went wrong';
  let details = err.details;

  if (err.type === 'entity.parse.failed') {
    status = 400; code = 'INVALID_JSON'; message = 'Request body is not valid JSON';
  } else if (err.type === 'entity.too.large') {
    status = 413; code = 'PAYLOAD_TOO_LARGE'; message = 'Request body is too large';
  } else if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      status = 409; code = 'DUPLICATE'; message = 'A record with these values already exists';
    } else if (err.code === 'P2025') {
      status = 404; code = 'NOT_FOUND'; message = 'Resource not found';
    } else if (err.code === 'P2003') {
      status = 409; code = 'CONSTRAINT'; message = 'This record is referenced by other data';
    } else {
      status = 500; code = 'DATABASE_ERROR'; message = 'Database error';
    }
  } else if (err.name === 'PrismaClientInitializationError') {
    status = 503; code = 'DATABASE_UNAVAILABLE'; message = 'Database is unavailable. Please try again.';
  } else if (!(err instanceof AppError)) {
    status = 500; code = 'INTERNAL_ERROR'; message = 'Something went wrong';
  }

  if (status >= 500) console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  if (status >= 500 && env.isProd) details = undefined;

  res.status(status).json({ error: { code, message, ...(details ? { details } : {}) } });
};
