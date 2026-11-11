import test from 'node:test';
import assert from 'node:assert/strict';
import {
  summarize, streaks, dailySeries, bestWorstDay, byMonth, byWeek, byPair, psychology, byStrategy,
} from '../src/utils/stats.js';
import { resolveRange, isDateStr } from '../src/utils/dates.js';
import { completeTrade, deriveRR, checkStopLossSide } from '../src/services/tradeCalc.js';
import { toCsv, csvCell } from '../src/utils/csv.js';

const T = (o) => ({
  tradeDate: '2026-01-05', pair: 'EURUSD', session: 'LONDON', direction: 'BUY',
  profitLoss: 0, result: 'BREAK_EVEN', rrAchieved: null, strategy: null, emotion: null,
  mistakes: null, entryTime: null, tradeNo: 1, ...o,
});

const sample = [
  T({ tradeNo: 1, tradeDate: '2026-01-05', profitLoss: 100, result: 'WIN', rrAchieved: 2, strategy: 'Breakout', emotion: 'Confidence, Patience' }),
  T({ tradeNo: 2, tradeDate: '2026-01-05', profitLoss: -50, result: 'LOSS', rrAchieved: -1, pair: 'GBPUSD', direction: 'SELL', mistakes: 'Moved SL' , emotion: 'Fear' }),
  T({ tradeNo: 3, tradeDate: '2026-01-06', profitLoss: 150, result: 'WIN', rrAchieved: 3, strategy: 'breakout', emotion: 'confidence' }),
  T({ tradeNo: 4, tradeDate: '2026-01-07', profitLoss: 0, result: 'BREAK_EVEN' }),
  T({ tradeNo: 5, tradeDate: '2026-02-02', profitLoss: -30, result: 'LOSS', rrAchieved: -1 }),
  T({ tradeNo: 6, tradeDate: '2026-02-03', profitLoss: -20, result: 'LOSS', rrAchieved: -0.5 }),
];

test('summarize: counts, sums and ratios', () => {
  const s = summarize(sample);
  assert.equal(s.totalTrades, 6);
  assert.equal(s.winningTrades, 2);
  assert.equal(s.losingTrades, 3);
  assert.equal(s.breakEvenTrades, 1);
  assert.equal(s.winRate, 33.33);
  assert.equal(s.totalProfit, 250);
  assert.equal(s.totalLoss, 100);
  assert.equal(s.netProfit, 150);
  assert.equal(s.avgWin, 125);
  assert.equal(s.avgLoss, 33.33);
  assert.equal(s.profitFactor, 2.5);
  assert.equal(s.avgRR, 0.5);
});

test('summarize: empty input and no-loss profit factor', () => {
  const s = summarize([]);
  assert.equal(s.totalTrades, 0);
  assert.equal(s.winRate, 0);
  assert.equal(s.avgRR, null);
  assert.equal(summarize([T({ profitLoss: 10, result: 'WIN' })]).profitFactor, null);
});

test('streaks: break-even interrupts a run', () => {
  const s = streaks(sample);
  assert.equal(s.maxConsecutiveWins, 1); // WIN, LOSS, WIN, BE, LOSS, LOSS
  assert.equal(s.maxConsecutiveLosses, 2);
  assert.deepEqual(s.current, { type: 'LOSS', count: 2 });
  const run = streaks([1, 2, 3].map((n) => T({ tradeNo: n, result: 'WIN', profitLoss: 1 })));
  assert.equal(run.maxConsecutiveWins, 3);
});

test('daily series, best and worst day, cumulative', () => {
  const d = dailySeries(sample);
  assert.deepEqual(d.map((x) => x.pl), [50, 150, 0, -30, -20]);
  assert.deepEqual(d.map((x) => x.cumulative), [50, 200, 200, 170, 150]);
  const { bestDay, worstDay } = bestWorstDay(d);
  assert.equal(bestDay.date, '2026-01-06');
  assert.equal(worstDay.date, '2026-02-02');
});

test('monthly, weekly and pair grouping', () => {
  const m = byMonth(sample);
  assert.deepEqual(m.map((x) => [x.key, x.netProfit]), [['2026-01', 200], ['2026-02', -50]]);
  const w = byWeek(sample);
  assert.equal(w[0].key, '2026-01-05'); // Monday
  assert.equal(w[0].totalTrades, 4);
  const p = byPair(sample);
  assert.equal(p[0].key, 'EURUSD');
  assert.equal(p[p.length - 1].key, 'GBPUSD');
});

test('strategy grouping is case-insensitive', () => {
  const s = byStrategy(sample);
  assert.equal(s.length, 1);
  assert.equal(s[0].totalTrades, 2);
  assert.equal(s[0].netProfit, 250);
});

test('psychology: emotion tokens and mistakes', () => {
  const p = psychology(sample);
  const conf = p.emotions.find((e) => e.emotion === 'confidence');
  assert.equal(conf.trades, 2);
  assert.equal(conf.netProfit, 250);
  assert.equal(p.mistakes.tradesWithMistakes, 1);
  assert.equal(p.mistakes.withMistakes.netProfit, -50);
  assert.equal(p.bestEmotion.emotion, 'confidence');
});

test('date ranges', () => {
  const r = resolveRange({ range: 'week', today: '2026-11-10' }); // Tuesday
  assert.equal(r.from.toISOString().slice(0, 10), '2026-11-09');
  assert.equal(r.to.toISOString().slice(0, 10), '2026-11-15');
  const lm = resolveRange({ range: 'lastMonth', today: '2026-01-15' });
  assert.equal(lm.from.toISOString().slice(0, 10), '2025-12-01');
  assert.equal(lm.to.toISOString().slice(0, 10), '2025-12-31');
  const y = resolveRange({ range: 'year', today: '2026-06-01' });
  assert.equal(y.to.toISOString().slice(0, 10), '2026-12-31');
  const c = resolveRange({ range: 'custom', from: '2026-03-10', to: '2026-03-01' });
  assert.equal(c.from.toISOString().slice(0, 10), '2026-03-01');
  assert.deepEqual(resolveRange({ range: 'all' }), { from: null, to: null });
  assert.equal(isDateStr('2026-02-30'), false);
  assert.equal(isDateStr('2026-02-28'), true);
});

test('trade completion: result, balances, R:R, risk %', () => {
  const t = completeTrade({
    direction: 'BUY', entryPrice: 1.1, exitPrice: 1.12, stopLoss: 1.09,
    balanceBefore: 1000, riskAmount: 20, profitLoss: 40,
  });
  assert.equal(t.result, 'WIN');
  assert.equal(t.balanceAfter, 1040);
  assert.equal(t.rrAchieved, 2);
  assert.equal(t.riskPercent, 2);
  const s = completeTrade({ direction: 'SELL', entryPrice: 100, exitPrice: 102, stopLoss: 101, balanceBefore: 500, balanceAfter: 480 });
  assert.equal(s.profitLoss, -20);
  assert.equal(s.result, 'LOSS');
  assert.equal(s.rrAchieved, -2);
  // user-provided values are never overridden
  const u = completeTrade({ direction: 'BUY', entryPrice: 1, exitPrice: 2, stopLoss: 0.5, profitLoss: 5, result: 'BREAK_EVEN', rrAchieved: 9 });
  assert.equal(u.result, 'BREAK_EVEN');
  assert.equal(u.rrAchieved, 9);
  assert.equal(deriveRR({ direction: 'BUY', entryPrice: 1, exitPrice: 1, stopLoss: 1 }), null);
});

test('stop-loss side validation', () => {
  assert.equal(checkStopLossSide({ direction: 'BUY', entryPrice: 1.1, stopLoss: 1.2 }), 'sl_side_buy');
  assert.equal(checkStopLossSide({ direction: 'SELL', entryPrice: 1.1, stopLoss: 1.0 }), 'sl_side_sell');
  assert.equal(checkStopLossSide({ direction: 'BUY', entryPrice: 1.1, stopLoss: 1.0 }), null);
  assert.equal(checkStopLossSide({ direction: 'BUY', entryPrice: 1.1, stopLoss: null }), null);
});

test('csv escaping, BOM and formula-injection guard', () => {
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('=SUM(A1)'), "'=SUM(A1)");
  assert.equal(csvCell(-12.5), '-12.5');
  assert.equal(csvCell('سلام'), 'سلام');
  const out = toCsv([{ header: 'A', value: (r) => r.a }], [{ a: 1 }, { a: '@x' }]);
  assert.ok(out.startsWith('﻿A\r\n1\r\n'));
  assert.ok(out.includes("'@x"));
});
