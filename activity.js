import { prisma } from '../config/db.js';

/** Writes an audit-log row. Logging must never break the request, so errors are swallowed. */
export async function logActivity(req, { userId, action, entity, entityId, metadata } = {}) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: userId ?? req?.user?.id ?? null,
        action,
        entity: entity ?? null,
        entityId: entityId ? String(entityId) : null,
        ip: req?.ip ? String(req.ip).slice(0, 64) : null,
        userAgent: req?.get?.('user-agent')?.slice(0, 255) ?? null,
        metadata: metadata ?? undefined,
      },
    });
  } catch (err) {
    console.error('[activity-log] failed:', err.message);
  }
}
