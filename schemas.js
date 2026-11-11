// zod schemas. Error messages are translation keys (frontend shows them via t('validation.<key>')).
import { z } from 'zod';
import { isDateStr } from './dates.js';

const emptyToNull = (v) => (v === '' ? null : v);

const optNum = (min = -1e12, max = 1e12) =>
  z.preprocess(
    emptyToNull,
    z.union([z.null(), z.coerce.number({ invalid_type_error: 'number' }).finite('number').min(min, 'range').max(max, 'range')]).optional(),
  );

const reqNum = (min = 0, max = 1e12) =>
  z.coerce.number({ invalid_type_error: 'number', required_error: 'required' }).finite('number').min(min, 'range').max(max, 'range');

const optText = (max) => z.preprocess(emptyToNull, z.string().trim().max(max, 'too_long').nullable().optional());

const optTime = z.preprocess(
  emptyToNull,
  z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'time').nullable().optional(),
);

const password = z
  .string({ required_error: 'required' })
  .min(8, 'password_min')
  .max(128, 'too_long')
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), 'password_weak');

// ---------- Auth ----------
export const registerSchema = z
  .object({
    fullName: z.string({ required_error: 'required' }).trim().min(2, 'name_min').max(120, 'too_long'),
    email: z.string({ required_error: 'required' }).trim().toLowerCase().email('email').max(254, 'too_long'),
    username: z
      .string({ required_error: 'required' })
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9_.]{3,30}$/, 'username'),
    password,
    confirmPassword: z.string({ required_error: 'required' }),
    language: z.enum(['en', 'fa']).optional(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'], message: 'password_mismatch' });

export const loginSchema = z.object({
  identifier: z.string({ required_error: 'required' }).trim().toLowerCase().min(1, 'required').max(254),
  password: z.string({ required_error: 'required' }).min(1, 'required').max(128),
  rememberMe: z.boolean().optional(),
});

export const forgotSchema = z.object({
  email: z.string({ required_error: 'required' }).trim().toLowerCase().email('email'),
});

export const resetSchema = z
  .object({
    token: z.string({ required_error: 'required' }).min(20).max(200),
    password,
    confirmPassword: z.string({ required_error: 'required' }),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'], message: 'password_mismatch' });

// ---------- Users ----------
export const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'name_min').max(120, 'too_long').optional(),
  email: z.string().trim().toLowerCase().email('email').max(254, 'too_long').optional(),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_.]{3,30}$/, 'username')
    .optional(),
});

export const settingsSchema = z.object({
  language: z.enum(['en', 'fa']).optional(),
  theme: z.enum(['dark', 'light']).optional(),
  startingBalance: optNum(0, 1e12),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'currency').optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string({ required_error: 'required' }).min(1, 'required'),
    password,
    confirmPassword: z.string({ required_error: 'required' }),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'], message: 'password_mismatch' });

// ---------- Trades ----------
const dateStr = z
  .string({ required_error: 'required' })
  .refine(isDateStr, 'date')
  .refine((s) => new Date(`${s}T00:00:00Z`) <= new Date(Date.now() + 2 * 86400000), 'date_future');

export const tradeShape = {
  tradeDate: dateStr,
  pair: z
    .string({ required_error: 'required' })
    .trim()
    .min(3, 'pair')
    .max(20, 'pair')
    .transform((s) => s.toUpperCase().replace(/[^A-Z0-9._]/g, ''))
    .refine((s) => s.length >= 3, 'pair'),
  session: z.enum(['ASIAN', 'LONDON', 'NEW_YORK', 'SYDNEY'], { errorMap: () => ({ message: 'required' }) }),
  direction: z.enum(['BUY', 'SELL'], { errorMap: () => ({ message: 'required' }) }),
  entryPrice: reqNum(0, 1e12).refine((v) => v > 0, 'range'),
  exitPrice: optNum(0, 1e12),
  stopLoss: optNum(0, 1e12),
  riskAmount: optNum(0, 1e12),
  riskPercent: optNum(0, 100),
  balanceBefore: optNum(-1e12, 1e12),
  balanceAfter: optNum(-1e12, 1e12),
  reasonForEntry: optText(5000),
  emotion: optText(200),
  reasonForExit: optText(5000),
  rrAchieved: optNum(-1000, 1000),
  lessonsLearned: optText(5000),
  mistakes: optText(5000),
  profitLoss: optNum(-1e12, 1e12),
  result: z.preprocess(emptyToNull, z.enum(['WIN', 'LOSS', 'BREAK_EVEN']).nullable().optional()),
  lotSize: optNum(0, 100000),
  commission: optNum(-1e9, 1e9),
  swap: optNum(-1e9, 1e9),
  strategy: optText(100),
  setup: optText(100),
  entryTime: optTime,
  exitTime: optTime,
  notes: optText(5000),
};

export const tradeCreateSchema = z.object(tradeShape).strict();
export const tradeUpdateSchema = z.object(tradeShape).partial().strict();

export const tradeQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  from: z.string().refine(isDateStr).optional(),
  to: z.string().refine(isDateStr).optional(),
  pair: z.string().trim().max(20).optional(),
  direction: z.enum(['BUY', 'SELL']).optional(),
  session: z.enum(['ASIAN', 'LONDON', 'NEW_YORK', 'SYDNEY']).optional(),
  result: z.enum(['WIN', 'LOSS', 'BREAK_EVEN']).optional(),
  sort: z.enum(['date_desc', 'date_asc', 'pl_desc', 'pl_asc']).default('date_desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(25),
});

export const rangeQuerySchema = z.object({
  range: z.enum(['today', 'week', 'month', 'lastMonth', 'year', 'all', 'custom']).default('all'),
  from: z.string().refine(isDateStr).optional(),
  to: z.string().refine(isDateStr).optional(),
  today: z.string().refine(isDateStr).optional(),
});

// ---------- Admin ----------
export const adminUserUpdateSchema = z
  .object({
    role: z.enum(['USER', 'ADMIN']).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
    fullName: z.string().trim().min(2, 'name_min').max(120, 'too_long').optional(),
  })
  .strict();

export const adminSettingsSchema = z
  .object({
    registrationOpen: z.boolean().optional(),
    defaultLanguage: z.enum(['en', 'fa']).optional(),
    supportedLanguages: z.array(z.enum(['en', 'fa'])).min(1, 'languages_min').optional(),
  })
  .strict();
