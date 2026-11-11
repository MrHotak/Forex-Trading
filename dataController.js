import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toCsv } from '../utils/csv.js';
import { serializeTrade, publicUser, publicSettings } from '../utils/serialize.js';
import { buildWhere, orderBy } from './tradeController.js';
import { logActivity } from '../services/activity.js';

const SESSION_LABEL = { ASIAN: 'Asian', LONDON: 'London', NEW_YORK: 'New York', SYDNEY: 'Sydney' };

const COLUMNS = [
  { header: 'Trade ID', value: (t) => t.tradeId },
  { header: 'Date', value: (t) => t.tradeDate },
  { header: 'Pair', value: (t) => t.pair },
  { header: 'Session', value: (t) => SESSION_LABEL[t.session] },
  { header: 'Direction', value: (t) => t.direction },
  { header: 'Entry Price', value: (t) => t.entryPrice },
  { header: 'Exit Price', value: (t) => t.exitPrice },
  { header: 'Stop Loss', value: (t) => t.stopLoss },
  { header: 'Risk Amount', value: (t) => t.riskAmount },
  { header: 'Risk %', value: (t) => t.riskPercent },
  { header: 'Lot Size', value: (t) => t.lotSize },
  { header: 'Balance Before', value: (t) => t.balanceBefore },
  { header: 'Balance After', value: (t) => t.balanceAfter },
  { header: 'Profit/Loss', value: (t) => t.profitLoss },
  { header: 'Result', value: (t) => t.result },
  { header: 'R:R', value: (t) => t.rrAchieved },
  { header: 'Commission', value: (t) => t.commission },
  { header: 'Swap', value: (t) => t.swap },
  { header: 'Strategy', value: (t) => t.strategy },
  { header: 'Setup', value: (t) => t.setup },
  { header: 'Entry Time', value: (t) => t.entryTime },
  { header: 'Exit Time', value: (t) => t.exitTime },
  { header: 'Reason for Entry', value: (t) => t.reasonForEntry },
  { header: 'Emotion', value: (t) => t.emotion },
  { header: 'Reason for Exit', value: (t) => t.reasonForExit },
  { header: 'Lessons Learned', value: (t) => t.lessonsLearned },
  { header: 'Mistakes', value: (t) => t.mistakes },
  { header: 'Notes', value: (t) => t.notes },
];

export const exportCsv = asyncHandler(async (req, res) => {
  const q = req.validatedQuery;
  const rows = await prisma.trade.findMany({ where: buildWhere(req.user.id, q), orderBy: orderBy(q.sort) });
  const csv = toCsv(COLUMNS, rows.map((r) => serializeTrade(r)));
  await logActivity(req, { action: 'data.export_csv', metadata: { rows: rows.length } });
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="forex-journal-trades-${new Date().toISOString().slice(0, 10)}.csv"`,
    'Cache-Control': 'no-store',
  });
  res.send(csv);
});

/** Full personal history (profile, settings, every trade) as JSON. Screenshots are not included. */
export const exportJson = asyncHandler(async (req, res) => {
  const [settings, trades] = await Promise.all([
    prisma.userSettings.findUnique({ where: { userId: req.user.id } }),
    prisma.trade.findMany({ where: { userId: req.user.id }, orderBy: [{ tradeDate: 'asc' }, { tradeNo: 'asc' }] }),
  ]);
  await logActivity(req, { action: 'data.export_json', metadata: { rows: trades.length } });
  res.set({
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Disposition': `attachment; filename="forex-journal-history-${new Date().toISOString().slice(0, 10)}.json"`,
    'Cache-Control': 'no-store',
  });
  res.send(
    JSON.stringify(
      { exportedAt: new Date().toISOString(), user: publicUser(req.user), settings: publicSettings(settings), trades: trades.map((t) => serializeTrade(t)) },
      null,
      2,
    ),
  );
});
