import { notFound } from './AppError.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** router.param(...) handler: a malformed id can never match a record, so answer 404 before touching the DB. */
export const uuidParam = (req, _res, next, value) => (UUID.test(value) ? next() : next(notFound()));
