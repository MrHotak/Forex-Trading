import { prisma } from '../config/db.js';

export const DEFAULT_APP_SETTINGS = {
  registrationOpen: true,
  defaultLanguage: 'en',
  supportedLanguages: ['en', 'fa'],
};

export async function getAppSettings() {
  const rows = await prisma.appSetting.findMany();
  const out = { ...DEFAULT_APP_SETTINGS };
  for (const r of rows) if (r.key in DEFAULT_APP_SETTINGS) out[r.key] = r.value;
  return out;
}

export async function saveAppSettings(patch) {
  await prisma.$transaction(
    Object.entries(patch).map(([key, value]) =>
      prisma.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } }),
    ),
  );
  return getAppSettings();
}
