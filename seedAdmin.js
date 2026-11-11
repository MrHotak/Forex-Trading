import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { prisma } from '../config/db.js';

/**
 * Creates the first administrator from ADMIN_EMAIL / ADMIN_PASSWORD (environment variables only).
 * - Nothing happens unless both are set.
 * - A new account is created if the email does not exist.
 * - If the account exists, it is promoted to ADMIN, but its password is never changed.
 */
export async function ensureAdmin() {
  const { email, password, username, fullName } = env.admin;
  if (!email || !password) return { status: 'skipped', reason: 'ADMIN_EMAIL / ADMIN_PASSWORD not set' };
  if (password.length < 8) throw new Error('ADMIN_PASSWORD must be at least 8 characters');

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role === 'ADMIN' && existing.status === 'ACTIVE') return { status: 'exists', email };
    await prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN', status: 'ACTIVE' } });
    return { status: 'promoted', email };
  }
  const usernameTaken = await prisma.user.findUnique({ where: { username } });
  if (usernameTaken) throw new Error(`ADMIN_USERNAME "${username}" is already used by another account`);

  await prisma.user.create({
    data: {
      fullName,
      email,
      username,
      passwordHash: await bcrypt.hash(password, 12),
      role: 'ADMIN',
      settings: { create: {} },
    },
  });
  return { status: 'created', email };
}

// CLI: `npm run seed:admin`
if (import.meta.url === `file://${process.argv[1]}`) {
  ensureAdmin()
    .then((r) => console.log('[seed:admin]', r))
    .catch((e) => {
      console.error('[seed:admin] failed:', e.message);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
