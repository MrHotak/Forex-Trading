# ژورنال معاملاتی فارکس (FOREX TRADING JOURNAL)

یک پلتفرم حرفه‌ای برای مدیریت عملکرد و روان‌شناسی معامله‌گری.
**ساخته و توسعه‌یافته توسط: Faridoon Faizi**

فرانت‌اند: React + Vite روی **Netlify** — بک‌اند: Node.js + Express روی **Render** — پایگاه داده: PostgreSQL روی **Neon**.
راهنمای کامل و جزئیات بیشتر در [README.md](./README.md) (انگلیسی) است. این فایل خلاصه‌ی مراحل است.

## ⚠️ آنچه تست شده و آنچه نشده

- **تست شده:** منطق محاسبات (۱۱ تست)، درستی کد همه فایل‌ها، ساخت (bundle) کل فرانت‌اند، و یکسان بودن ۴۸۴ کلید ترجمه فارسی/انگلیسی.
- **تست نشده:** اجرای واقعی با پایگاه داده Neon و مرورگر (در محیط ساخت اینترنت نبود). بنابراین بعد از استقرار، **چک‌لیست بخش ۹ در README.md را یک بار کامل اجرا کنید** (ثبت‌نام، افزودن معامله، خروج و ورود دوباره، ری‌استارت سرور، ورود از موبایل).

## مراحل سریع

### ۱) ساخت پایگاه داده در Neon
1. در neon.tech یک پروژه بسازید.
2. دو رشته اتصال بردارید: **Pooled** (که `-pooler` دارد) برای `DATABASE_URL` و **Direct** برای `DIRECT_URL`.
3. به انتهای `DATABASE_URL` این را اضافه کنید: `&pgbouncer=true&connect_timeout=15`

### ۲) اجرای محلی
```bash
cd FOREX-TRADING-JOURNAL/backend
cp .env.example .env        # مقادیر را پر کنید
npm install
npx prisma migrate deploy   # ساخت جدول‌ها
npm run seed:admin          # ساخت مدیر اول
npm run dev                 # http://localhost:4000

cd ../frontend
npm install
npm run dev                 # http://localhost:5173  (در حالت محلی VITE_API_URL را خالی بگذارید)
```
ساخت `JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### ۳) ساخت مدیر اول
در `.env` بک‌اند مقدار `ADMIN_EMAIL`، `ADMIN_USERNAME` و یک `ADMIN_PASSWORD` قوی بگذارید و سرور را اجرا کنید (یا `npm run seed:admin`). بعد از ساخته شدن حساب، `ADMIN_PASSWORD` را از تنظیمات حذف کنید. رمز مدیر هیچ‌جا در کد نیست و کاربر عادی نمی‌تواند خودش را مدیر کند.

### ۴) استقرار بک‌اند روی Render
پروژه را در GitHub بگذارید. در Render یک **Web Service** بسازید:
- Root Directory: `backend`
- Build Command: `npm install && npm run build`  (جدول‌ها را هم می‌سازد)
- Start Command: `npm start`
- Health Check Path: `/api/health`
- متغیرها: `NODE_ENV=production`، `PORT=10000`، `DATABASE_URL`، `DIRECT_URL`، `JWT_SECRET`، `FRONTEND_URL`، `ADMIN_EMAIL`، `ADMIN_USERNAME`، `ADMIN_PASSWORD`

بعد از استقرار، آدرس `/api/health` و `/api/health/db` را باز کنید؛ باید `ok` ببینید. (پلن رایگان Render بعد از بیکاری می‌خوابد؛ اولین درخواست تا ۱ دقیقه طول می‌کشد.)

### ۵) استقرار فرانت‌اند روی Netlify
سایت را از همان مخزن GitHub وارد کنید. فایل `netlify.toml` همه تنظیمات (دایرکتوری، دستور build، و ریدایرکت برای React Router) را دارد. در **Environment variables** این را بگذارید:
```
VITE_API_URL = https://YOUR-RENDER-BACKEND-URL.onrender.com/api
```
(بعد از تغییر متغیر، دوباره Deploy کنید.)

### ۶) اتصال دو سرویس (CORS)
آدرس Netlify (بدون `/` آخر) را در Render به‌عنوان `FRONTEND_URL` ذخیره کنید، مثلاً `https://my-journal.netlify.app`.

## پشتیبان‌گیری (مدیر)
```bash
cd backend
DIRECT_URL="postgresql://..." npm run backup
TARGET_URL="postgresql://...(پایگاه داده خالی)" sh scripts/restore.sh backups/فایل.dump
```
بازیابی را همیشه در یک پایگاه داده/شاخه **جدید و خالی** انجام دهید، نه روی داده‌ی فعال.

## مشکلات رایج
- **خطای CORS:** `FRONTEND_URL` دقیقاً با آدرس Netlify یکی نیست (http/https یا `/` آخر).
- **«ارتباط با سرور برقرار نشد»:** `VITE_API_URL` اشتباه است (باید به `/api` ختم شود) یا بعد از تغییر دوباره Deploy نکرده‌اید، یا Render در حال بیدار شدن است.
- **خطای build در Render روی migrate:** `DIRECT_URL` را (بدون `-pooler`) و با `sslmode=require` وارد کنید.
- **ورود مدیر ممکن نیست:** `ADMIN_*` هنگام شروع سرور تنظیم نبوده؛ تنظیم کنید و سرور را ری‌استارت کنید.
- **ایمیل بازنشانی نمی‌رسد:** SMTP تنظیم نشده؛ مدیر از «مدیریت کاربران ← ساخت پیوند بازنشانی» استفاده کند.
- **PDF فارسی:** از «ذخیره به‌صورت PDF» در پنجره چاپ مرورگر (Chrome/Edge) استفاده کنید.
