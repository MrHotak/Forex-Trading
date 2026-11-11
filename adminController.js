import { z } from 'zod';
import { prisma, checkDatabase } from '../config/db.js';
import { env } from '../config/env.js';
import { AppError, notFound } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { publicUser, publicSettings, dateOnly } from '../utils/serialize.js';
import { logActivity } from '../services/activity.js';
import { getAppSettings, saveAppSettings } from '../services/appSettings.js';
import { createResetToken } from '../services/passwordReset.js';
import { buildResetUrl } from '../services/mailer.js';

const pageQuery = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};
export const usersQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  ...pageQuery,
});
export const logsQuerySchema = z.object({
  action: z.string().trim().max(60).optional(),
  userId: z.string().uuid().optional(),
  ...pageQuery,
});

export const dashboard = asyncHandler(async (_req, res) => {
  const now = Date.now();
  const days = (n) => new Date(now - n * 86400000);
  const [
    totalUsers, activeAccounts, activeLast30, newLast7, byRole, byStatus,
    totalTrades, resultGroups, recent, activityByDay, recentActivity,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { lastLoginAt: { gte: days(30) } } }),
    prisma.user.count({ where: { createdAt: { gte: days(7) } } }),
    prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    prisma.user.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.trade.count(),
    prisma.trade.groupBy({ by: ['result'], _count: { _all: true } }),
    prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
    prisma.$queryRaw`SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
                     FROM activity_logs WHERE created_at >= now() - interval '14 days' GROUP BY 1 ORDER BY 1`,
    prisma.activityLog.findMany({ orderBy: { createdAt: 'desc' }, take: 8, include: { user: { select: { username: true } } } }),
  ]);
  const count = (r) => resultGroups.find((g) => g.result === r)?._count._all ?? 0;
  res.json({
    totalUsers,
    activeAccounts,
    activeLast30Days: activeLast30,
    newLast7Days: newLast7,
    usersByRole: Object.fromEntries(byRole.map((g) => [g.role, g._count._all])),
    usersByStatus: Object.fromEntries(byStatus.map((g) => [g.status, g._count._all])),
    totalTrades,
    winningTrades: count('WIN'),
    losingTrades: count('LOSS'),
    breakEvenTrades: count('BREAK_EVEN'),
    recentRegistrations: recent.map(publicUser),
    activityByDay,
    recentActivity: recentActivity.map((a) => ({ id: a.id, action: a.action, username: a.user?.username ?? null, createdAt: a.createdAt })),
  });
});

export const listUsers = asyncHandler(async (req, res) => {
  const q = req.validatedQuery;
  const where = {
    ...(q.role && { role: q.role }),
    ...(q.status && { status: q.status }),
    ...(q.q && {
      OR: [
        { email: { contains: q.q, mode: 'insensitive' } },
        { username: { contains: q.q, mode: 'insensitive' } },
        { fullName: { contains: q.q, mode: 'insensitive' } },
      ],
    }),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { _count: { select: { trades: true } } },
    }),
  ]);
  res.json({
    items: rows.map((u) => ({ ...publicUser(u), tradeCount: u._count.trades })),
    total,
    page: q.page,
    pageSize: q.pageSize,
    totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
  });
});

// Administrators see account information and counts only, never another user's trade content.
export const getUser = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id }, include: { settings: true } });
  if (!user) throw notFound('USER_NOT_FOUND', 'User not found');
  const [tradeCount, lastTrade, attachmentCount] = await Promise.all([
    prisma.trade.count({ where: { userId: user.id } }),
    prisma.trade.findFirst({ where: { userId: user.id }, orderBy: { tradeDate: 'desc' }, select: { tradeDate: true } }),
    prisma.tradeAttachment.count({ where: { userId: user.id } }),
  ]);
  res.json({
    user: publicUser(user),
    settings: publicSettings(user.settings),
    tradeCount,
    attachmentCount,
    lastTradeDate: lastTrade ? dateOnly(lastTrade.tradeDate) : null,
  });
});

export const updateUser = asyncHandler(async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) throw notFound('USER_NOT_FOUND', 'User not found');
  const { role, status, fullName } = req.body;

  const changesRole = role && role !== target.role;
  const changesStatus = status && status !== target.status;
  if (target.id === req.user.id && (changesRole || changesStatus)) {
    throw new AppError(400, 'CANNOT_MODIFY_SELF', 'You cannot change your own role or status');
  }
  const losesAdminAccess = target.role === 'ADMIN' && (role === 'USER' || (status && status !== 'ACTIVE'));
  if (losesAdminAccess) {
    const otherAdmins = await prisma.user.count({ where: { role: 'ADMIN', status: 'ACTIVE', id: { not: target.id } } });
    if (otherAdmins < 1) throw new AppError(400, 'LAST_ADMIN', 'At least one active administrator must remain');
  }

  const user = await prisma.user.update({
    where: { id: target.id },
    data: { ...(role && { role }), ...(status && { status }), ...(fullName && { fullName }) },
  });
  await logActivity(req, {
    action: 'admin.update_user',
    entity: 'user',
    entityId: user.id,
    metadata: { before: { role: target.role, status: target.status }, after: { role: user.role, status: user.status } },
  });
  res.json({ user: publicUser(user) });
});

/** Lets an administrator hand a user a one-time reset link when SMTP email is not configured. */
export const createResetLink = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) throw notFound('USER_NOT_FOUND', 'User not found');
  const token = await createResetToken(user.id);
  await logActivity(req, { action: 'admin.create_reset_link', entity: 'user', entityId: user.id });
  res.json({ resetUrl: buildResetUrl(token), expiresInMinutes: 60 });
});

export const activityLogs = asyncHandler(async (req, res) => {
  const q = req.validatedQuery;
  const where = { ...(q.action && { action: { contains: q.action } }), ...(q.userId && { userId: q.userId }) };
  const [total, rows] = await prisma.$transaction([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { user: { select: { username: true, email: true } } },
    }),
  ]);
  res.json({
    items: rows.map((a) => ({
      id: a.id, action: a.action, entity: a.entity, entityId: a.entityId, ip: a.ip,
      userId: a.userId, username: a.user?.username ?? null, email: a.user?.email ?? null,
      metadata: a.metadata, createdAt: a.createdAt,
    })),
    total,
    page: q.page,
    pageSize: q.pageSize,
    totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
  });
});

export const systemStatus = asyncHandler(async (_req, res) => {
  const db = await checkDatabase();
  let database = { ...db };
  if (db.ok) {
    const [[v], [s], tables] = await Promise.all([
      prisma.$queryRaw`SELECT version() AS version`,
      prisma.$queryRaw`SELECT pg_database_size(current_database())::float8 AS size`,
      Promise.all([prisma.user.count(), prisma.trade.count(), prisma.tradeAttachment.count(), prisma.activityLog.count()]),
    ]);
    database = {
      ...db,
      version: v.version,
      sizeBytes: Math.round(s.size),
      rows: { users: tables[0], trades: tables[1], attachments: tables[2], activityLogs: tables[3] },
    };
  }
  const mem = process.memoryUsage();
  res.json({
    api: {
      status: 'ok',
      environment: env.isProd ? 'production' : 'development',
      nodeVersion: process.version,
      startedAt: env.startedAt,
      uptimeSeconds: Math.round(process.uptime()),
      memoryMb: Math.round(mem.rss / 1048576),
      smtpConfigured: Boolean(env.smtp.host && env.smtp.user && env.smtp.pass),
    },
    database,
  });
});

export const getSettings = asyncHandler(async (_req, res) => res.json({ settings: await getAppSettings() }));

export const updateSettings = asyncHandler(async (req, res) => {
  const current = await getAppSettings();
  const next = { ...current, ...req.body };
  if (!next.supportedLanguages.includes(next.defaultLanguage)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Default language must be a supported language', [
      { field: 'defaultLanguage', message: 'default_language_unsupported' },
    ]);
  }
  const settings = await saveAppSettings(req.body);
  await logActivity(req, { action: 'admin.update_settings', metadata: req.body });
  res.json({ settings });
});
