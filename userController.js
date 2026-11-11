import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { publicUser, publicSettings } from '../utils/serialize.js';
import { signToken } from '../middleware/auth.js';
import { logActivity } from '../services/activity.js';

export const getProfile = asyncHandler(async (req, res) => {
  const [settings, tradeCount] = await Promise.all([
    prisma.userSettings.findUnique({ where: { userId: req.user.id } }),
    prisma.trade.count({ where: { userId: req.user.id } }),
  ]);
  res.json({ user: publicUser(req.user), settings: publicSettings(settings), tradeCount });
});

// Role and status are deliberately NOT accepted here (the schema ignores them): users cannot promote themselves.
export const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, email, username } = req.body;
  const clash = await prisma.user.findFirst({
    where: { id: { not: req.user.id }, OR: [email ? { email } : undefined, username ? { username } : undefined].filter(Boolean) },
    select: { email: true, username: true },
  });
  if (clash) {
    const emailTaken = email && clash.email === email;
    throw new AppError(409, emailTaken ? 'EMAIL_TAKEN' : 'USERNAME_TAKEN', 'Already in use', [
      { field: emailTaken ? 'email' : 'username', message: emailTaken ? 'email_taken' : 'username_taken' },
    ]);
  }
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { ...(fullName && { fullName }), ...(email && { email }), ...(username && { username }) },
  });
  await logActivity(req, { action: 'user.update_profile', entity: 'user', entityId: user.id });
  res.json({ user: publicUser(user) });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const { language, theme, startingBalance, currency } = req.body;
  const data = {
    ...(language && { language }),
    ...(theme && { theme }),
    ...(startingBalance !== undefined && startingBalance !== null && { startingBalance }),
    ...(currency && { currency }),
  };
  const settings = await prisma.userSettings.upsert({
    where: { userId: req.user.id },
    create: { userId: req.user.id, ...data },
    update: data,
  });
  await logActivity(req, { action: 'user.update_settings', entity: 'user', entityId: req.user.id, metadata: Object.keys(data) });
  res.json({ settings: publicSettings(settings) });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, password } = req.body;
  const ok = await bcrypt.compare(currentPassword, req.user.passwordHash);
  if (!ok) {
    throw new AppError(400, 'WRONG_PASSWORD', 'Current password is incorrect', [
      { field: 'currentPassword', message: 'wrong_password' },
    ]);
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { passwordHash, passwordChangedAt: new Date() },
  });
  await logActivity(req, { action: 'user.change_password', entity: 'user', entityId: user.id });
  // All previously issued tokens (other devices) stop working; hand back a fresh one for this device.
  res.json({ ok: true, token: signToken(user.id) });
});
