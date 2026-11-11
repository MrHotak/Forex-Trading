import { AppError } from '../utils/AppError.js';

/** validate(schema, 'body' | 'query') -> replaces req[source] with the parsed (typed, trimmed) value. */
export const validate =
  (schema, source = 'body') =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: i.path.join('.') || '_',
        message: i.message,
      }));
      return next(new AppError(400, 'VALIDATION_ERROR', 'Please check the highlighted fields', details));
    }
    if (source === 'query') req.validatedQuery = result.data;
    else req[source] = result.data;
    next();
  };
