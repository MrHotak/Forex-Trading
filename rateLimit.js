import rateLimit from 'express-rate-limit';

const make = (windowMs, limit, code) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) =>
      res.status(429).json({ error: { code, message: 'Too many requests, please try again later.' } }),
  });

export const apiLimiter = make(15 * 60 * 1000, 600, 'RATE_LIMITED');
export const authLimiter = make(15 * 60 * 1000, 25, 'RATE_LIMITED_AUTH');
export const uploadLimiter = make(60 * 60 * 1000, 60, 'RATE_LIMITED');
