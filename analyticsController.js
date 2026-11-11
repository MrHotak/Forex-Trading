import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { resolveRange, fmt } from '../utils/dates.js';
import { tradeForStats } from '../utils/serialize.js';
import * as S from '../utils/stats.js';

const SELECT = {
  tradeNo: true, tradeDate: true, pair: true, session: true, direction: true, profitLoss: true,
  result: true, rrAchieved: true, strategy: true, emotion: true, mistakes: true, entryTime: true,
};

async function loadTrades(req) {
  const q = req.validatedQuery;
  const { from, to } = resolveRange(q);
  const where = { userId: req.user.id };
  if (from || to) {
    where.tradeDate = {};
    if (from) where.tradeDate.gte = from;
    if (to) where.tradeDate.lte = to;
  }
  const rows = await prisma.trade.findMany({ where, select: SELECT });
  return {
    trades: rows.map(tradeForStats),
    range: { range: q.range, from: from ? fmt(from) : null, to: to ? fmt(to) : null },
  };
}

/**
 * Current balance rule (documented in the Help page):
 *  1. if the most recent trade has "balance after", that value is the current balance;
 *  2. otherwise starting balance (Settings) + the sum of all recorded profit/loss.
 */
async function currentBalance(userId) {
  const [settings, last, agg] = await Promise.all([
    prisma.userSettings.findUnique({ where: { userId } }),
    prisma.trade.findFirst({
      where: { userId },
      orderBy: [{ tradeDate: 'desc' }, { tradeNo: 'desc' }],
      select: { balanceAfter: true },
    }),
    prisma.trade.aggregate({ where: { userId }, _sum: { profitLoss: true } }),
  ]);
  const starting = Number(settings?.startingBalance ?? 0);
  const fromTrades = last?.balanceAfter !== null && last?.balanceAfter !== undefined;
  return {
    startingBalance: starting,
    currentBalance: fromTrades ? Number(last.balanceAfter) : S.round2(starting + Number(agg._sum.profitLoss ?? 0)),
    source: fromTrades ? 'last_trade' : 'starting_balance_plus_pl',
  };
}

export const overview = asyncHandler(async (req, res) => {
  const { trades, range } = await loadTrades(req);
  const daily = S.dailySeries(trades);
  const pairs = S.byPair(trades);
  const sessions = S.bySession(trades);
  const strategies = S.byStrategy(trades);
  const { bestDay, worstDay } = S.bestWorstDay(daily);
  const pw = S.bestWorst(pairs);
  const sw = S.bestWorst(sessions);
  res.json({
    range,
    ...(await currentBalance(req.user.id)),
    summary: S.summarize(trades),
    bestDay,
    worstDay,
    daily,
    weekly: S.byWeek(trades),
    monthly: S.byMonth(trades),
    pairs,
    sessions,
    directions: S.byDirection(trades),
    strategies,
    streaks: S.streaks(trades),
    bestPair: pw.best,
    worstPair: pw.worst,
    bestSession: sw.best,
    bestStrategy: strategies.length ? strategies[0] : null,
  });
});

export const monthly = asyncHandler(async (req, res) => {
  const { trades, range } = await loadTrades(req);
  res.json({ range, monthly: S.byMonth(trades), weekly: S.byWeek(trades), daily: S.dailySeries(trades) });
});

export const pairs = asyncHandler(async (req, res) => {
  const { trades, range } = await loadTrades(req);
  const rows = S.byPair(trades);
  res.json({ range, pairs: rows, ...(() => { const { best, worst } = S.bestWorst(rows); return { best, worst }; })() });
});

export const sessions = asyncHandler(async (req, res) => {
  const { trades, range } = await loadTrades(req);
  const rows = S.bySession(trades);
  res.json({ range, sessions: rows, directions: S.byDirection(trades), best: S.bestWorst(rows).best });
});

export const psychology = asyncHandler(async (req, res) => {
  const { trades, range } = await loadTrades(req);
  res.json({ range, ...S.psychology(trades) });
});
