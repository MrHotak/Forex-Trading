import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { signToken } from '../middleware/auth.js';
import { AppError, unauthorized, forbidden } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { publicUser, publicSettings } from '../utils/serialize.js';
import { logActivity } from '../services/activity.js';
import { getAppSettings } from '../services/appSettings.js';
import { createResetToken, sha256 } from '../services/passwordReset.js';
import { sendPasswordResetEmail, buildResetUrl } from '../services/mailer.js';

const BCRYPT_COST = 12;
// Compared against when the account does not exist, so response time does not reveal valid usernames.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_COST);

export const register = asyncHandler(async (req, res) => {
  const appSettings = await getAppSettings();
  if (!appSettings.registrationOpen) throw forbidden('REGISTRATION_CLOSED', 'Registration is currently closed');

  const { fullName, email, username, password, language } = req.body;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { email: true, username: true },
  });
  if (existing) {
    const emailTaken = existing.email === email;
    throw new AppError(
      409,
      emailTaken ? 'EMAIL_TAKEN' : 'USERNAME_TAKEN',
      emailTaken ? 'This email is already registered' : 'This username is already taken',
      [{ field: emailTaken ? 'email' : 'username', message: emailTaken ? 'email_taken' : 'username_taken' }],
    );
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  // Role is always USER here. Administrators are only created through the protected ADMIN_* environment setup.
  const user = await prisma.user.create({
    data: {
      fullName,
      email,
      username,
      passwordHash,
      role: 'USER',
      settings: { create: { language: language || appSettings.defaultLanguage } },
    },
    include: { settings: true },
  });

  await logActivity(req, { userId: user.id, action: 'auth.register', entity: 'user', entityId: user.id });
  res.status(201).json({ token: signToken(user.id), user: publicUser(user), settings: publicSettings(user.settings) });
});

export const login = asyncHandler(async (req, res) => {
  const { identifier, password, rememberMe } = req.body;
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { username: identifier }] },
    include: { settings: true },
  });

  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) {
    await logActivity(req, { userId: user?.id ?? null, action: 'auth.login_failed', metadata: { identifier: identifier.slice(0, 60) } });
    throw unauthorized('INVALID_CREDENTIALS', 'Incorrect email/username or password');
  }
  if (user.status === 'SUSPENDED') throw forbidden('ACCOUNT_SUSPENDED', 'Your account has been suspended');
  if (user.status === 'INACTIVE') throw forbidden('ACCOUNT_INACTIVE', 'Your account is deactivated');

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await logActivity(req, { userId: user.id, action: 'auth.login', entity: 'user', entityId: user.id });
  res.json({ token: signToken(user.id, Boolean(rememberMe)), user: publicUser(user), settings: publicSettings(user.settings) });
});

export const logout = asyncHandler(async (req, res) => {
  // Tokens are stateless; the client discards its token. We record the event for the audit log.
  await logActivity(req, { action: 'auth.logout', entity: 'user', entityId: req.user.id });
  res.json({ ok: true });
});

export const me = asyncHandler(async (req, res) => {
  const settings = await prisma.userSettings.findUnique({ where: { userId: req.user.id } });
  res.json({ user: publicUser(req.user), settings: publicSettings(settings) });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  // Same response whether or not the account exists, so emails cannot be enumerated.
  if (user && user.status !== 'SUSPENDED') {
    const token = await createResetToken(user.id);
    try {
      await sendPasswordResetEmail(user.email, buildResetUrl(token));
    } catch (err) {
      console.error('[mailer] send failed:', err.message);
    }
    await logActivity(req, { userId: user.id, action: 'auth.forgot_password', entity: 'user', entityId: user.id });
  }
  res.json({ ok: true });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new AppError(400, 'RESET_TOKEN_INVALID', 'This reset link is invalid or has expired');
  }
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash, passwordChangedAt: new Date() } }),
    prisma.passwordResetToken.updateMany({ where: { userId: record.userId, usedAt: null }, data: { usedAt: new Date() } }),
  ]);
  await logActivity(req, { userId: record.userId, action: 'auth.reset_password', entity: 'user', entityId: record.userId });
  res.json({ ok: true });
});
