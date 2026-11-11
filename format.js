export const isNil = (v) => v === null || v === undefined || v === '';

export function money(v, currency = 'USD', { sign = false } = {}) {
  if (isNil(v)) return '—';
  const n = Number(v);
  const abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const prefix = n < 0 ? '-' : sign && n > 0 ? '+' : '';
  const sym = { USD: '$', EUR: '€', GBP: '£', JPY: '¥' }[currency];
  return sym ? `${prefix}${sym}${abs}` : `${prefix}${abs} ${currency}`;
}

export const num = (v, digits = 2) =>
  isNil(v) ? '—' : Number(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: digits });

export const price = (v) => (isNil(v) ? '—' : Number(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 6, useGrouping: false }));
export const pct = (v) => (isNil(v) ? '—' : `${Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`);
export const plClass = (v) => (Number(v) > 0 ? 'pos' : Number(v) < 0 ? 'neg' : 'flat');

/** Local calendar date as YYYY-MM-DD (not UTC), so "today" matches the trader's own day. */
export function localDate(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function formatDate(s, lang = 'en') {
  if (!s) return '—';
  const d = new Date(`${String(s).slice(0, 10)}T00:00:00Z`);
  return d.toLocaleDateString(lang === 'fa' ? 'fa-IR-u-ca-gregory-nu-latn' : 'en-GB', { year: 'numeric', month: 'short', day: '2-digit', timeZone: 'UTC' });
}

export function formatDateTime(s, lang = 'en') {
  if (!s) return '—';
  return new Date(s).toLocaleString(lang === 'fa' ? 'fa-IR-u-ca-gregory-nu-latn' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export function monthLabel(ym, lang = 'en') {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(lang === 'fa' ? 'fa-IR-u-ca-gregory-nu-latn' : 'en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}

export function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

export const SESSIONS = ['ASIAN', 'LONDON', 'NEW_YORK', 'SYDNEY'];
export const RESULTS = ['WIN', 'LOSS', 'BREAK_EVEN'];
export const DIRECTIONS = ['BUY', 'SELL'];
export const EMOTIONS = ['confidence', 'fear', 'greed', 'patience', 'anxiety', 'overconfidence', 'discipline'];
export const PAIR_SUGGESTIONS = ['EURUSD', 'GBPUSD', 'XAUUSD', 'USDJPY', 'BTCUSD', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD', 'EURJPY', 'GBPJPY', 'US30', 'NAS100'];
