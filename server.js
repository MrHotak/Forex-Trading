import { env } from './config/env.js';
import { prisma } from './config/db.js';
import app from './app.js';
import { ensureAdmin } from './utils/seedAdmin.js';

const server = app.listen(env.port, '0.0.0.0', async () => {
  console.log(`[server] listening on port ${env.port} (${env.isProd ? 'production' : 'development'})`);
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('[db] connected');
    const admin = await ensureAdmin();
    console.log('[admin]', admin.status, admin.email ?? '');
  } catch (err) {
    // Do not crash: Neon may be waking up from auto-suspend. Requests will retry the connection.
    console.error('[startup] database/admin setup failed:', err.message);
  }
});

async function shutdown(signal) {
  console.log(`[server] ${signal} received, shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
