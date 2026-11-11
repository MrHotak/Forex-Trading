import { ResultBadge, DirectionBadge } from './ui.jsx';
import { money, price, pct, num, formatDate, plClass } from '../utils/format.js';

/**
 * Every column of the journal table (all fields of the trade form).
 * `default: true` columns are visible the first time; the user can show or hide any of them.
 */
export const COLUMNS = [
  { key: 'tradeId', label: 'trade.fields.tradeId', default: true, render: (r) => <code>{r.tradeId}</code> },
  { key: 'tradeDate', label: 'trade.fields.tradeDate', default: true, sort: 'date', render: (r, c) => formatDate(r.tradeDate, c.lang) },
  { key: 'pair', label: 'trade.fields.pair', default: true, render: (r) => <strong>{r.pair}</strong> },
  { key: 'session', label: 'trade.fields.session', default: true, render: (r, c) => c.t(`session.${r.session}`) },
  { key: 'direction', label: 'trade.fields.direction', default: true, render: (r) => <DirectionBadge direction={r.direction} /> },
  { key: 'entryPrice', label: 'trade.fields.entryPrice', default: true, num: true, render: (r) => price(r.entryPrice) },
  { key: 'exitPrice', label: 'trade.fields.exitPrice', default: true, num: true, render: (r) => price(r.exitPrice) },
  { key: 'stopLoss', label: 'trade.fields.stopLoss', num: true, render: (r) => price(r.stopLoss) },
  { key: 'riskAmount', label: 'trade.fields.riskAmount', num: true, render: (r, c) => money(r.riskAmount, c.currency) },
  { key: 'riskPercent', label: 'trade.fields.riskPercent', num: true, render: (r) => pct(r.riskPercent) },
  { key: 'lotSize', label: 'trade.fields.lotSize', num: true, render: (r) => num(r.lotSize, 4) },
  { key: 'balanceBefore', label: 'trade.fields.balanceBefore', num: true, render: (r, c) => money(r.balanceBefore, c.currency) },
  { key: 'balanceAfter', label: 'trade.fields.balanceAfter', num: true, render: (r, c) => money(r.balanceAfter, c.currency) },
  { key: 'profitLoss', label: 'trade.fields.profitLoss', default: true, sort: 'pl', num: true, render: (r, c) => <span className={plClass(r.profitLoss)}>{money(r.profitLoss, c.currency, { sign: true })}</span> },
  { key: 'result', label: 'trade.fields.result', default: true, render: (r) => <ResultBadge result={r.result} /> },
  { key: 'rrAchieved', label: 'trade.fields.rrAchieved', default: true, num: true, render: (r) => (r.rrAchieved === null ? '—' : `${num(r.rrAchieved)}R`) },
  { key: 'commission', label: 'trade.fields.commission', num: true, render: (r, c) => money(r.commission, c.currency) },
  { key: 'swap', label: 'trade.fields.swap', num: true, render: (r, c) => money(r.swap, c.currency) },
  { key: 'strategy', label: 'trade.fields.strategy', render: (r) => r.strategy || '—' },
  { key: 'setup', label: 'trade.fields.setup', render: (r) => r.setup || '—' },
  { key: 'entryTime', label: 'trade.fields.entryTime', render: (r) => r.entryTime || '—' },
  { key: 'exitTime', label: 'trade.fields.exitTime', render: (r) => r.exitTime || '—' },
  { key: 'emotion', label: 'trade.fields.emotion', render: (r) => r.emotion || '—' },
  { key: 'reasonForEntry', label: 'trade.fields.reasonForEntry', long: true, render: (r) => r.reasonForEntry || '—' },
  { key: 'reasonForExit', label: 'trade.fields.reasonForExit', long: true, render: (r) => r.reasonForExit || '—' },
  { key: 'lessonsLearned', label: 'trade.fields.lessonsLearned', long: true, render: (r) => r.lessonsLearned || '—' },
  { key: 'mistakes', label: 'trade.fields.mistakes', long: true, render: (r) => r.mistakes || '—' },
  { key: 'notes', label: 'trade.fields.notes', long: true, render: (r) => r.notes || '—' },
  { key: 'attachmentCount', label: 'trade.fields.screenshot', num: true, render: (r) => r.attachmentCount ?? 0 },
];

export const DEFAULT_VISIBLE = COLUMNS.filter((c) => c.default).map((c) => c.key);
