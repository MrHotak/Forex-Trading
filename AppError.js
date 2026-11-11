export class AppError extends Error {
  /**
   * @param {number} status HTTP status
   * @param {string} code   stable machine-readable code; the frontend translates it
   * @param {string} message English fallback message
   * @param {object} [details]
   */
  constructor(status, code, message, details) {
    super(message || code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (code, message, details) => new AppError(400, code, message, details);
export const unauthorized = (code = 'UNAUTHORIZED', message = 'Authentication required') => new AppError(401, code, message);
export const forbidden = (code = 'FORBIDDEN', message = 'You do not have permission') => new AppError(403, code, message);
export const notFound = (code = 'NOT_FOUND', message = 'Resource not found') => new AppError(404, code, message);
export const conflict = (code, message) => new AppError(409, code, message);
