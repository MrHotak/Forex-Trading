import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;
const smtpConfigured = () => Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }
  return transporter;
}

/** Returns true when an email was actually handed to the SMTP server. */
export async function sendPasswordResetEmail(to, resetUrl) {
  if (!smtpConfigured()) {
    if (!env.isProd) console.log(`[mailer] SMTP not configured. Password reset link for ${to}: ${resetUrl}`);
    else console.warn('[mailer] SMTP is not configured: reset email not sent. An admin can generate a reset link.');
    return false;
  }
  await getTransporter().sendMail({
    from: env.smtp.from,
    to,
    subject: 'Reset your Forex Trading Journal password / بازنشانی رمز عبور',
    text: `Open this link to choose a new password (valid for 1 hour):\n${resetUrl}\n\nاین پیوند برای انتخاب رمز عبور جدید است و یک ساعت اعتبار دارد.\n\nIf you did not request this, ignore this email.`,
  });
  return true;
}

export const buildResetUrl = (token) => `${env.frontendUrls[0]}/reset-password?token=${encodeURIComponent(token)}`;
