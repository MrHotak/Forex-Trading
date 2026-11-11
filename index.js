// Data models are defined in prisma/schema.prisma. This module re-exports the client
// and the enumerations so controllers never hard-code them.
export { prisma } from '../config/db.js';

export const ROLES = ['USER', 'ADMIN'];
export const ACCOUNT_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
export const SESSIONS = ['ASIAN', 'LONDON', 'NEW_YORK', 'SYDNEY'];
export const DIRECTIONS = ['BUY', 'SELL'];
export const RESULTS = ['WIN', 'LOSS', 'BREAK_EVEN'];
export const LANGUAGES = ['en', 'fa'];

export const DECIMAL_TRADE_FIELDS = [
  'entryPrice', 'exitPrice', 'stopLoss', 'riskAmount', 'riskPercent', 'balanceBefore', 'balanceAfter',
  'rrAchieved', 'profitLoss', 'lotSize', 'commission', 'swap',
];
