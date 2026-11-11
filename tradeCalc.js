// Pure helpers that complete / derive trade fields. Used by create and update.
import { round2 } from '../utils/stats.js';

const has = (v) => v !== null && v !== undefined;

export const deriveResult = (profitLoss) => (profitLoss > 0 ? 'WIN' : profitLoss < 0 ? 'LOSS' : 'BREAK_EVEN');

/** Achieved R:R = price move in trade direction / initial risk distance (|entry - stop loss|). */
export function deriveRR({ direction, entryPrice, exitPrice, stopLoss }) {
  if (![entryPrice, exitPrice, stopLoss].every(has)) return null;
  const risk = Math.abs(entryPrice - stopLoss);
  if (risk === 0) return null;
  const move = direction === 'BUY' ? exitPrice - entryPrice : entryPrice - exitPrice;
  return round2(move / risk);
}

/**
 * Fill in values the trader did not type, but never override values they did.
 * - profitLoss from balances, balanceAfter from balanceBefore + P/L
 * - result from the sign of profitLoss
 * - rrAchieved from entry / exit / stop loss
 * - riskPercent from riskAmount and balanceBefore
 */
export function completeTrade(input) {
  const t = { ...input };
  if (!has(t.profitLoss) && has(t.balanceBefore) && has(t.balanceAfter)) {
    t.profitLoss = round2(t.balanceAfter - t.balanceBefore);
  }
  if (!has(t.profitLoss)) t.profitLoss = 0;
  if (!has(t.balanceAfter) && has(t.balanceBefore)) {
    t.balanceAfter = round2(t.balanceBefore + t.profitLoss);
  }
  if (!has(t.result)) t.result = deriveResult(t.profitLoss);
  if (!has(t.rrAchieved)) {
    const rr = deriveRR(t);
    if (rr !== null) t.rrAchieved = rr;
  }
  if (!has(t.riskPercent) && has(t.riskAmount) && has(t.balanceBefore) && t.balanceBefore > 0) {
    t.riskPercent = Math.min(100, round2((t.riskAmount / t.balanceBefore) * 100));
  }
  return t;
}

/** Stop loss must sit on the losing side of the entry. Returns an error key or null. */
export function checkStopLossSide({ direction, entryPrice, stopLoss }) {
  if (!has(stopLoss) || !has(entryPrice) || stopLoss === entryPrice) return null;
  if (direction === 'BUY' && stopLoss > entryPrice) return 'sl_side_buy';
  if (direction === 'SELL' && stopLoss < entryPrice) return 'sl_side_sell';
  return null;
}
