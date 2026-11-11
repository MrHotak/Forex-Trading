// Verifies the translations:
//  1. English and Persian have exactly the same keys, with the same {placeholders}.
//  2. Every translation key referenced anywhere in src/ exists in English.
// Run with: npm run check:i18n   (exit code 1 on any problem)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const en = (await import(pathToFileURL(join(root, 'translations', 'en.js')))).default;
const fa = (await import(pathToFileURL(join(root, 'translations', 'fa.js')))).default;

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) => (v && typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]]));
const enMap = new Map(flatten(en));
const faMap = new Map(flatten(fa));
const problems = [];

for (const k of enMap.keys()) if (!faMap.has(k)) problems.push(`missing in Persian: ${k}`);
for (const k of faMap.keys()) if (!enMap.has(k)) problems.push(`missing in English: ${k}`);
const placeholders = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
for (const [k, v] of enMap) {
  if (faMap.has(k) && placeholders(v) !== placeholders(faMap.get(k))) problems.push(`placeholder mismatch: ${k}`);
  if (typeof v !== 'string' || !v.trim()) problems.push(`empty English text: ${k}`);
}
for (const [k, v] of faMap) if (typeof v !== 'string' || !v.trim()) problems.push(`empty Persian text: ${k}`);

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(jsx?|mjs)$/.test(f) && !p.includes('translations') ? [p] : [];
  });

const namespaces = new Set([...enMap.keys()].map((k) => k.split('.')[0]));
const literal = /['"`]([a-zA-Z]+(?:\.[a-zA-Z0-9_]+)+)['"`]/g;
const used = new Set();
for (const file of walk(root)) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(literal)) if (namespaces.has(m[1].split('.')[0])) used.add(m[1]);
}
// Dynamic keys such as t(`session.${x}`) are checked by listing the values they can take.
const dynamic = {
  session: ['ASIAN', 'LONDON', 'NEW_YORK', 'SYDNEY'],
  direction: ['BUY', 'SELL'],
  result: ['WIN', 'LOSS', 'BREAK_EVEN'],
  emotion: ['confidence', 'fear', 'greed', 'patience', 'anxiety', 'overconfidence', 'discipline'],
  roles: ['USER', 'ADMIN'],
  status: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
  range: ['today', 'week', 'month', 'lastMonth', 'year', 'all', 'custom'],
  'metrics.balanceSource': ['last_trade', 'starting_balance_plus_pl'],
  'landing.features': ['journal', 'analytics', 'psychology', 'calendar', 'screenshots', 'export', 'bilingual', 'private'],
  'help.sections': ['start', 'fields', 'auto', 'metrics', 'balance', 'psychology', 'screenshots', 'data', 'privacy', 'password'],
  'psychology': ['withMistakes', 'withoutMistakes'],
  'analytics': ['monthly', 'weekly', 'daily'],
};
for (const [prefix, vals] of Object.entries(dynamic)) {
  for (const v of vals) {
    const keys = prefix === 'landing.features' ? [`${prefix}.${v}.title`, `${prefix}.${v}.text`] : prefix === 'help.sections' ? [`${prefix}.${v}.title`, `${prefix}.${v}.body`] : [`${prefix}.${v}`];
    keys.forEach((k) => used.add(k));
  }
}
// Server error codes and validation messages arrive at runtime; all of them must be translated.
const serverCodes = ['UNAUTHORIZED', 'INVALID_TOKEN', 'FORBIDDEN', 'ADMIN_ONLY', 'ACCOUNT_SUSPENDED', 'ACCOUNT_INACTIVE', 'INVALID_CREDENTIALS', 'VALIDATION_ERROR', 'EMAIL_TAKEN', 'USERNAME_TAKEN', 'REGISTRATION_CLOSED', 'RESET_TOKEN_INVALID', 'TRADE_NOT_FOUND', 'ATTACHMENT_NOT_FOUND', 'USER_NOT_FOUND', 'NOT_FOUND', 'ROUTE_NOT_FOUND', 'NO_FILE', 'FILE_TOO_LARGE', 'INVALID_FILE_TYPE', 'TOO_MANY_ATTACHMENTS', 'UPLOAD_FAILED', 'CANNOT_MODIFY_SELF', 'LAST_ADMIN', 'WRONG_PASSWORD', 'RATE_LIMITED', 'RATE_LIMITED_AUTH', 'DUPLICATE', 'CONSTRAINT', 'DATABASE_ERROR', 'DATABASE_UNAVAILABLE', 'INTERNAL_ERROR', 'NETWORK_ERROR', 'TIMEOUT', 'INVALID_JSON', 'PAYLOAD_TOO_LARGE'];
serverCodes.forEach((c) => used.add(`errors.${c}`));
const validationKeys = ['required', 'email', 'username', 'name_min', 'password_min', 'password_weak', 'password_mismatch', 'too_long', 'number', 'range', 'date', 'date_future', 'time', 'pair', 'currency', 'languages_min', 'email_taken', 'username_taken', 'wrong_password', 'sl_side_buy', 'sl_side_sell', 'default_language_unsupported'];
validationKeys.forEach((k) => used.add(`validation.${k}`));

for (const k of used) if (!enMap.has(k)) problems.push(`used in code but not translated: ${k}`);

console.log(`English keys: ${enMap.size}, Persian keys: ${faMap.size}, keys referenced in code: ${used.size}`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n - ${problems.join('\n - ')}`);
  process.exit(1);
}
console.log('i18n check passed: EN and FA are in sync and every referenced key exists.');
