import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/db.js';
import { unauthorized, forbidden } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const signToken = (userId, rememberMe = false) =>
  jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: rememberMe ? '30d' : '1d' });

/**
 * Verifies the Bearer token and loads the user from the database on every request,
 * so role changes, suspension and password changes take effect immediately.
 */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    throw unauthorized('INVALID_TOKEN', 'Session expired or invalid');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw unauthorized('INVALID_TOKEN', 'Session expired or invalid');
  if (user.passwordChangedAt && payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
    throw unauthorized('INVALID_TOKEN', 'Session expired or invalid');
  }
  if (user.status === 'SUSPENDED') throw forbidden('ACCOUNT_SUSPENDED', 'Your account has been suspended');
  if (user.status === 'INACTIVE') throw forbidden('ACCOUNT_INACTIVE', 'Your account is deactivated');

  req.user = user;
  next();
});

export const requireAdmin = (req, _res, next) => {
  if (req.user?.role !== 'ADMIN') return next(forbidden('ADMIN_ONLY', 'Administrator access required'));
  next();
};
