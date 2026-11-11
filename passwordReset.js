import crypto from 'node:crypto';
import { prisma } from '../config/db.js';

export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const ONE_HOUR = 60 * 60 * 1000;

/** Creates a one-time token (only its SHA-256 hash is stored) and invalidates earlier unused tokens. */
export async function createResetToken(userId) {
  const raw = crypto.randomBytes(32).toString('hex');
  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.create({
      data: { userId, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + ONE_HOUR) },
    }),
  ]);
  return raw;
}
