import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

// One shared client. With Neon, DATABASE_URL must be the pooled (-pooler) connection string.
export const prisma = new PrismaClient({
  log: env.isProd ? ['error'] : ['warn', 'error'],
});

export async function checkDatabase() {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - started };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - started, error: env.isProd ? 'unreachable' : err.message };
  }
}
