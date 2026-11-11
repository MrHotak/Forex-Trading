import { DECIMAL_TRADE_FIELDS } from '../models/index.js';

const num = (v) => (v === null || v === undefined ? null : Number(v));
export const dateOnly = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : d);
export const tradeCode = (no) => `FTJ-${String(no).padStart(6, '0')}`;

export function serializeTrade(t, { attachments } = {}) {
  const out = { ...t };
  for (const f of DECIMAL_TRADE_FIELDS) out[f] = num(t[f]);
  out.tradeDate = dateOnly(t.tradeDate);
  out.tradeId = tradeCode(t.tradeNo);
  delete out._count;
  if (t._count) out.attachmentCount = t._count.attachments;
  if (attachments) out.attachments = attachments;
  return out;
}

export const serializeAttachmentMeta = (a) => ({
  id: a.id,
  tradeId: a.tradeId,
  fileName: a.fileName,
  mimeType: a.mimeType,
  sizeBytes: a.sizeBytes,
  createdAt: a.createdAt,
});

export const publicUser = (u) => ({
  id: u.id,
  fullName: u.fullName,
  email: u.email,
  username: u.username,
  role: u.role,
  status: u.status,
  createdAt: u.createdAt,
  lastLoginAt: u.lastLoginAt,
});

export const publicSettings = (s) =>
  s
    ? { language: s.language, theme: s.theme, startingBalance: num(s.startingBalance), currency: s.currency }
    : { language: 'en', theme: 'dark', startingBalance: 0, currency: 'USD' };

/** Analytics rows (from the database) -> plain numbers for the pure stats helpers. */
export const tradeForStats = (t) => ({
  tradeNo: t.tradeNo,
  tradeDate: dateOnly(t.tradeDate),
  pair: t.pair,
  session: t.session,
  direction: t.direction,
  profitLoss: Number(t.profitLoss),
  result: t.result,
  rrAchieved: num(t.rrAchieved),
  strategy: t.strategy,
  emotion: t.emotion,
  mistakes: t.mistakes,
  entryTime: t.entryTime,
});
