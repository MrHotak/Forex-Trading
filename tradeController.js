import path from 'node:path';
import { prisma } from '../config/db.js';
import { AppError, notFound } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toDate } from '../utils/dates.js';
import { serializeTrade, serializeAttachmentMeta } from '../utils/serialize.js';
import { completeTrade, checkStopLossSide } from '../services/tradeCalc.js';
import { logActivity } from '../services/activity.js';
import { sniffImage, MAX_ATTACHMENTS_PER_TRADE } from '../middleware/upload.js';

const OPTIONAL_NULLABLE = [
  'exitPrice', 'stopLoss', 'riskAmount', 'riskPercent', 'balanceBefore', 'balanceAfter', 'reasonForEntry',
  'emotion', 'reasonForExit', 'rrAchieved', 'lessonsLearned', 'mistakes', 'lotSize', 'strategy', 'setup',
  'entryTime', 'exitTime', 'notes',
];

const attachmentSelect = { id: true, tradeId: true, fileName: true, mimeType: true, sizeBytes: true, createdAt: true };

export function buildWhere(userId, q) {
  const where = { userId };
  if (q.from || q.to) {
    where.tradeDate = {};
    if (q.from) where.tradeDate.gte = toDate(q.from);
    if (q.to) where.tradeDate.lte = toDate(q.to);
  }
  if (q.pair) where.pair = q.pair.toUpperCase();
  if (q.direction) where.direction = q.direction;
  if (q.session) where.session = q.session;
  if (q.result) where.result = q.result;
  if (q.q) {
    const contains = { contains: q.q, mode: 'insensitive' };
    where.OR = [
      { pair: contains }, { strategy: contains }, { setup: contains }, { notes: contains },
      { reasonForEntry: contains }, { reasonForExit: contains }, { emotion: contains },
      { lessonsLearned: contains }, { mistakes: contains },
    ];
  }
  return where;
}

export const orderBy = (sort) =>
  ({
    date_desc: [{ tradeDate: 'desc' }, { tradeNo: 'desc' }],
    date_asc: [{ tradeDate: 'asc' }, { tradeNo: 'asc' }],
    pl_desc: [{ profitLoss: 'desc' }, { tradeNo: 'desc' }],
    pl_asc: [{ profitLoss: 'asc' }, { tradeNo: 'desc' }],
  })[sort];

/** Turns a validated payload into the full set of columns to write (omitted optional fields become NULL). */
function toWriteData(parsed) {
  const t = completeTrade(parsed);
  const side = checkStopLossSide(t);
  if (side) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Stop loss is on the wrong side of the entry price', [
      { field: 'stopLoss', message: side },
    ]);
  }
  const data = { ...t, tradeDate: toDate(t.tradeDate) };
  for (const k of OPTIONAL_NULLABLE) data[k] = t[k] ?? null;
  data.commission = t.commission ?? 0;
  data.swap = t.swap ?? 0;
  data.profitLoss = t.profitLoss ?? 0;
  return data;
}

export const listTrades = asyncHandler(async (req, res) => {
  const q = req.validatedQuery;
  const where = buildWhere(req.user.id, q);
  const [total, rows] = await prisma.$transaction([
    prisma.trade.count({ where }),
    prisma.trade.findMany({
      where,
      orderBy: orderBy(q.sort),
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: { _count: { select: { attachments: true } } },
    }),
  ]);
  res.json({
    items: rows.map((r) => serializeTrade(r)),
    total,
    page: q.page,
    pageSize: q.pageSize,
    totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
  });
});

/** Distinct values used by the filter dropdowns and the form's suggestion lists. */
export const tradeMeta = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  // "not: null" is only valid on nullable columns (strategy, setup); pair is required, so it needs no filter.
  const distinct = async (field) =>
    (
      await prisma.trade.findMany({
        where: field === 'pair' ? { userId } : { userId, [field]: { not: null } },
        distinct: [field],
        select: { [field]: true },
        orderBy: { [field]: 'asc' },
        take: 200,
      })
    )
      .map((r) => r[field])
      .filter(Boolean);
  const [pairs, strategies, setups] = await Promise.all([distinct('pair'), distinct('strategy'), distinct('setup')]);
  res.json({ pairs, strategies, setups });
});

async function findOwned(userId, id, include) {
  const trade = await prisma.trade.findFirst({ where: { id, userId }, include });
  if (!trade) throw notFound('TRADE_NOT_FOUND', 'Trade not found');
  return trade;
}

export const getTrade = asyncHandler(async (req, res) => {
  const trade = await findOwned(req.user.id, req.params.id, {
    attachments: { select: attachmentSelect, orderBy: { createdAt: 'asc' } },
  });
  res.json({ trade: serializeTrade(trade, { attachments: trade.attachments.map(serializeAttachmentMeta) }) });
});

export const createTrade = asyncHandler(async (req, res) => {
  const data = toWriteData(req.body);
  const trade = await prisma.trade.create({ data: { ...data, userId: req.user.id } });
  await logActivity(req, { action: 'trade.create', entity: 'trade', entityId: trade.id });
  res.status(201).json({ trade: serializeTrade(trade, { attachments: [] }) });
});

// PUT replaces the whole record: the edit form always sends every field.
export const updateTrade = asyncHandler(async (req, res) => {
  await findOwned(req.user.id, req.params.id);
  const data = toWriteData(req.body);
  const trade = await prisma.trade.update({
    where: { id: req.params.id },
    data,
    include: { attachments: { select: attachmentSelect, orderBy: { createdAt: 'asc' } } },
  });
  await logActivity(req, { action: 'trade.update', entity: 'trade', entityId: trade.id });
  res.json({ trade: serializeTrade(trade, { attachments: trade.attachments.map(serializeAttachmentMeta) }) });
});

export const deleteTrade = asyncHandler(async (req, res) => {
  await findOwned(req.user.id, req.params.id);
  await prisma.trade.delete({ where: { id: req.params.id } }); // attachments cascade
  await logActivity(req, { action: 'trade.delete', entity: 'trade', entityId: req.params.id });
  res.json({ ok: true });
});

// ---------------- Chart screenshots ----------------
const cleanFileName = (name, ext) => {
  const base = path.basename(String(name || 'screenshot')).replace(/[^\p{L}\p{N}._ -]/gu, '').trim().slice(0, 100);
  return base && /\.[a-z0-9]{2,5}$/i.test(base) ? base : `${base || 'screenshot'}.${ext}`;
};

export const uploadAttachment = asyncHandler(async (req, res) => {
  const trade = await findOwned(req.user.id, req.params.id, { _count: { select: { attachments: true } } });
  if (!req.file) throw new AppError(400, 'NO_FILE', 'Choose an image to upload');
  if (trade._count.attachments >= MAX_ATTACHMENTS_PER_TRADE) {
    throw new AppError(400, 'TOO_MANY_ATTACHMENTS', `A trade can have at most ${MAX_ATTACHMENTS_PER_TRADE} screenshots`);
  }
  const type = sniffImage(req.file.buffer);
  if (!type) throw new AppError(415, 'INVALID_FILE_TYPE', 'Only PNG, JPEG or WebP images are allowed');

  const att = await prisma.tradeAttachment.create({
    data: {
      tradeId: trade.id,
      userId: req.user.id,
      fileName: cleanFileName(req.file.originalname, type.ext),
      mimeType: type.mime,
      sizeBytes: req.file.size,
      data: req.file.buffer,
    },
    select: attachmentSelect,
  });
  await logActivity(req, { action: 'attachment.upload', entity: 'trade', entityId: trade.id });
  res.status(201).json({ attachment: serializeAttachmentMeta(att) });
});

export const getAttachment = asyncHandler(async (req, res) => {
  const att = await prisma.tradeAttachment.findFirst({
    where: { id: req.params.attId, tradeId: req.params.id, userId: req.user.id },
  });
  if (!att) throw notFound('ATTACHMENT_NOT_FOUND', 'Screenshot not found');
  res.set({
    'Content-Type': att.mimeType,
    'Content-Length': String(att.sizeBytes),
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'Cache-Control': 'private, max-age=3600',
    'Cross-Origin-Resource-Policy': 'cross-origin',
  });
  res.send(Buffer.from(att.data));
});

export const deleteAttachment = asyncHandler(async (req, res) => {
  const result = await prisma.tradeAttachment.deleteMany({
    where: { id: req.params.attId, tradeId: req.params.id, userId: req.user.id },
  });
  if (!result.count) throw notFound('ATTACHMENT_NOT_FOUND', 'Screenshot not found');
  await logActivity(req, { action: 'attachment.delete', entity: 'trade', entityId: req.params.id });
  res.json({ ok: true });
});
