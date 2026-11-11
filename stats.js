// Pure statistics over plain trade objects. No database access here, so it is unit-testable.
// A trade looks like:
// { tradeDate:'YYYY-MM-DD', pair, session, direction, profitLoss:number, result:'WIN'|'LOSS'|'BREAK_EVEN',
//   rrAchieved:number|null, strategy, emotion, mistakes, entryTime, tradeNo }
import { weekStart, toDate, fmt } from './dates.js';

export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const sum = (arr) => arr.reduce((s, x) => s + x, 0);

/**
 * Definitions (documented in README / Help page):
 * winRate      = WIN trades / all trades * 100 (break-even trades count in the denominator)
 * totalProfit  = sum of positive P/L,  totalLoss = absolute sum of negative P/L
 * avgWin       = mean P/L of WIN trades, avgLoss = mean absolute P/L of LOSS trades
 * profitFactor = totalProfit / totalLoss (null when there is no loss)
 * avgRR        = mean of recorded achieved R:R values
 */
export function summarize(trades) {
  const total = trades.length;
  const wins = trades.filter((t) => t.result === 'WIN');
  const losses = trades.filter((t) => t.result === 'LOSS');
  const breakEven = trades.filter((t) => t.result === 'BREAK_EVEN');
  const grossProfit = sum(trades.filter((t) => t.profitLoss > 0).map((t) => t.profitLoss));
  const grossLoss = Math.abs(sum(trades.filter((t) => t.profitLoss < 0).map((t) => t.profitLoss)));
  const net = sum(trades.map((t) => t.profitLoss));
  const rrs = trades.map((t) => t.rrAchieved).filter((v) => v !== null && v !== undefined);
  return {
    totalTrades: total,
    winningTrades: wins.length,
    losingTrades: losses.length,
    breakEvenTrades: breakEven.length,
    winRate: total ? round2((wins.length / total) * 100) : 0,
    totalProfit: round2(grossProfit),
    totalLoss: round2(grossLoss),
    netProfit: round2(net),
    avgWin: wins.length ? round2(sum(wins.map((t) => t.profitLoss)) / wins.length) : 0,
    avgLoss: losses.length ? round2(Math.abs(sum(losses.map((t) => t.profitLoss))) / losses.length) : 0,
    profitFactor: grossLoss > 0 ? round2(grossProfit / grossLoss) : null,
    avgRR: rrs.length ? round2(sum(rrs) / rrs.length) : null,
    expectancy: total ? round2(net / total) : 0,
  };
}

export function groupBy(trades, keyFn) {
  const map = new Map();
  for (const t of trades) {
    const keys = [].concat(keyFn(t)).filter((k) => k !== null && k !== undefined && k !== '');
    for (const k of keys) {
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(t);
    }
  }
  return map;
}

export function groupedSummary(trades, keyFn, { sort = 'net' } = {}) {
  const rows = [...groupBy(trades, keyFn).entries()].map(([key, list]) => ({ key, ...summarize(list) }));
  if (sort === 'key') rows.sort((a, b) => (a.key < b.key ? -1 : 1));
  else rows.sort((a, b) => b.netProfit - a.netProfit);
  return rows;
}

export const byMonth = (trades) => groupedSummary(trades, (t) => t.tradeDate.slice(0, 7), { sort: 'key' });
export const byWeek = (trades) =>
  groupedSummary(trades, (t) => fmt(weekStart(toDate(t.tradeDate))), { sort: 'key' });
export const byPair = (trades) => groupedSummary(trades, (t) => t.pair);
export const bySession = (trades) => groupedSummary(trades, (t) => t.session);
export const byDirection = (trades) => groupedSummary(trades, (t) => t.direction);
export const byStrategy = (trades) =>
  groupedSummary(trades, (t) => (t.strategy ? t.strategy.trim().toLowerCase() : null)).map((r) => ({
    ...r,
    label: trades.find((t) => t.strategy && t.strategy.trim().toLowerCase() === r.key)?.strategy.trim(),
  }));

/** Daily performance with a running cumulative P/L. */
export function dailySeries(trades) {
  const rows = groupedSummary(trades, (t) => t.tradeDate, { sort: 'key' }).map((r) => ({
    date: r.key,
    pl: r.netProfit,
    trades: r.totalTrades,
    wins: r.winningTrades,
    losses: r.losingTrades,
  }));
  let cum = 0;
  return rows.map((r) => ({ ...r, cumulative: round2((cum += r.pl)) }));
}

export function bestWorstDay(daily) {
  if (!daily.length) return { bestDay: null, worstDay: null };
  const best = daily.reduce((a, b) => (b.pl > a.pl ? b : a));
  const worst = daily.reduce((a, b) => (b.pl < a.pl ? b : a));
  return { bestDay: best, worstDay: worst };
}

export function bestWorst(rows) {
  if (!rows.length) return { best: null, worst: null };
  return { best: rows[0], worst: rows[rows.length - 1] }; // rows sorted by net desc
}

const orderKey = (t) => `${t.tradeDate}|${t.entryTime || '99:99'}|${String(t.tradeNo ?? 0).padStart(12, '0')}`;

/** Longest consecutive winning / losing runs. Break-even trades interrupt both runs. */
export function streaks(trades) {
  const ordered = [...trades].sort((a, b) => (orderKey(a) < orderKey(b) ? -1 : 1));
  let maxWin = 0;
  let maxLoss = 0;
  let run = 0;
  let runType = null;
  for (const t of ordered) {
    const type = t.result === 'WIN' ? 'WIN' : t.result === 'LOSS' ? 'LOSS' : null;
    if (type && type === runType) run += 1;
    else {
      runType = type;
      run = type ? 1 : 0;
    }
    if (runType === 'WIN') maxWin = Math.max(maxWin, run);
    if (runType === 'LOSS') maxLoss = Math.max(maxLoss, run);
  }
  return {
    maxConsecutiveWins: maxWin,
    maxConsecutiveLosses: maxLoss,
    current: runType ? { type: runType, count: run } : { type: null, count: 0 },
  };
}

/** Emotions are free text; comma / Arabic comma / semicolon separate several emotions in one trade. */
export const emotionTokens = (emotion) =>
  (emotion || '')
    .split(/[,،;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export function psychology(trades) {
  const emotions = groupedSummary(trades, (t) => emotionTokens(t.emotion)).map((r) => ({
    emotion: r.key,
    trades: r.totalTrades,
    winRate: r.winRate,
    netProfit: r.netProfit,
    avgPL: r.totalTrades ? round2(r.netProfit / r.totalTrades) : 0,
  }));
  const withMistakes = trades.filter((t) => t.mistakes && t.mistakes.trim());
  const withoutMistakes = trades.filter((t) => !(t.mistakes && t.mistakes.trim()));
  const slice = (list) => {
    const s = summarize(list);
    return { trades: s.totalTrades, winRate: s.winRate, netProfit: s.netProfit };
  };
  return {
    emotions,
    mistakes: {
      tradesWithMistakes: withMistakes.length,
      percentWithMistakes: trades.length ? round2((withMistakes.length / trades.length) * 100) : 0,
      withMistakes: slice(withMistakes),
      withoutMistakes: slice(withoutMistakes),
    },
    bestEmotion: emotions.length ? [...emotions].sort((a, b) => b.netProfit - a.netProfit)[0] : null,
    worstEmotion: emotions.length ? [...emotions].sort((a, b) => a.netProfit - b.netProfit)[0] : null,
  };
}
