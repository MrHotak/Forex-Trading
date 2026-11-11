import 'dotenv/config';

const isProd = process.env.NODE_ENV === 'production';

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

const jwtSecret = required('JWT_SECRET');
if (isProd && jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production.');
}

export const env = {
  isProd,
  port: Number(process.env.PORT) || 4000,
  databaseUrl: required('DATABASE_URL'),
  jwtSecret,
  frontendUrls: (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean),
  admin: {
    email: (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
    username: (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase(),
    password: process.env.ADMIN_PASSWORD || '',
    fullName: process.env.ADMIN_FULL_NAME || 'Administrator',
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'Forex Trading Journal <no-reply@localhost>',
  },
  startedAt: new Date(),
};
