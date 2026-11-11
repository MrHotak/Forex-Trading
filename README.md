# FOREX TRADING JOURNAL

A Professional Trading Performance & Psychology Management Platform.
**Created & Developed By: Faridoon Faizi**

A full-stack, bilingual (English / Persian with RTL) forex trading journal.

| Layer    | Technology                                   | Hosting |
|----------|----------------------------------------------|---------|
| Frontend | React 18, Vite, React Router, Axios, Recharts, Lucide icons, plain CSS | Netlify |
| Backend  | Node.js 20, Express, JWT, bcrypt, Zod, Multer | Render  |
| Database | PostgreSQL through Prisma ORM                 | Neon    |

> Persian quick-start: see [README.fa.md](./README.fa.md).

---

## 1. What is verified and what is not

Be aware of this before you deploy.

**Verified in the build environment**
- 11 unit tests for the calculation logic (win rate, profit factor, streaks, R:R, date ranges, CSV export): `cd backend && npm test`.
- Every backend file passes a Node syntax check.
- Every frontend file parses, and the whole app bundles with all imports/exports resolving.
- English and Persian translations contain exactly the same 484 keys, and every key used in the code exists: `cd frontend && npm run check:i18n`.

**Not verified here (no internet / no database was available)**
- The backend was never run against a live PostgreSQL database, and `npm install`, `vite build` and the browser UI were not executed.
- So the checklist in section 9 is **your acceptance test**. Run it once after deploying. If something fails, the troubleshooting section (10) covers the likely causes.

---

## 2. Architecture

```
Browser (React SPA on Netlify)
      │  HTTPS, JSON, Authorization: Bearer <JWT>
      ▼
Express REST API on Render  ──►  Prisma  ──►  Neon PostgreSQL (pooled connection)
```

- All data (users, trades, screenshots, settings, logs) is stored in PostgreSQL. Nothing is stored in memory or LocalStorage except the login token, plus harmless UI caches (theme/language cache, table column choice).
- Screenshots are stored in the database (`BYTEA`) because Render's disk is wiped on every restart.
- Every trade query is filtered by the authenticated `user_id`. Administrators can manage accounts but the API never returns another user's trade content.
- Roles: `USER`, `ADMIN`. Role is checked on the server for every `/api/admin/*` route. Registration always creates a `USER`; the role cannot be sent by the client.

### Folder structure

```
FOREX-TRADING-JOURNAL/
├── frontend/              React + Vite app
│   ├── src/{components,pages,layouts,dashboard,admin,user,translations,services,hooks,context,utils}
│   ├── scripts/check-i18n.mjs
│   └── .env.example
├── backend/
│   ├── src/{config,controllers,middleware,models,routes,services,utils}  app.js  server.js
│   ├── prisma/schema.prisma   and   prisma/migrations/
│   ├── scripts/backup.sh  restore.sh
│   ├── tests/stats.test.js
│   ├── render.yaml            (optional Render blueprint)
│   └── .env.example
├── netlify.toml
├── README.md   README.fa.md   .gitignore
```

### Database tables

`users`, `trades`, `trade_attachments`, `user_settings`, `activity_logs`, `password_reset_tokens`, plus `app_settings` (platform settings managed by admins). All have `created_at` / `updated_at`, foreign keys and indexes. Trades and attachments use `ON DELETE RESTRICT` toward users, so no user row can be deleted while trade records exist, and **nothing in the application deletes history automatically**. Only the trade's owner can delete a trade.

---

## 3. Required software

- Node.js 20 or newer and npm (`node -v`)
- Git
- A free Neon account (https://neon.tech), a Render account, a Netlify account
- Optional for backups: PostgreSQL client tools (`pg_dump`, `pg_restore`, version 15+)

---

## 4. Run locally

### 4.1 Create the Neon database (also used for local development)

1. Neon console → **Create project** (any region, Postgres 16). The default database is `neondb`.
2. Open **Connect**. Copy two connection strings:
   - **Pooled connection** (host contains `-pooler`) → this is `DATABASE_URL`.
   - **Direct connection** (toggle off "Connection pooling") → this is `DIRECT_URL`.
3. For `DATABASE_URL` append `&pgbouncer=true&connect_timeout=15`, e.g.
   `postgresql://USER:PASSWORD@ep-xxxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&connect_timeout=15`

> You may also use a local PostgreSQL: set both variables to the same
> `postgresql://postgres:password@localhost:5432/forex_journal`.

### 4.2 Backend

```bash
cd FOREX-TRADING-JOURNAL/backend
cp .env.example .env            # then edit .env (see section 5)
npm install
npx prisma migrate deploy       # creates all tables in the database
npm run seed:admin              # creates the first administrator (needs ADMIN_* in .env)
npm run dev                     # API on http://localhost:4000
```

Check it: open http://localhost:4000/api/health and http://localhost:4000/api/health/db.

Generate a strong JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 4.3 Frontend

```bash
cd FOREX-TRADING-JOURNAL/frontend
npm install
cp .env.example .env            # for local dev, delete the VITE_API_URL line (the dev server proxies /api to port 4000)
npm run dev                     # http://localhost:5173
```

### 4.4 Tests

```bash
cd backend  && npm test
cd frontend && npm run check:i18n
```

---

## 5. Environment variables

### Backend (`backend/.env`, or the Render dashboard)

| Variable | Required | Meaning |
|----------|----------|---------|
| `NODE_ENV` | yes | `production` on Render |
| `PORT` | yes | `10000` on Render, `4000` locally |
| `DATABASE_URL` | yes | Neon **pooled** connection string (`…-pooler…?sslmode=require&pgbouncer=true`) |
| `DIRECT_URL` | yes | Neon **direct** connection string; Prisma uses it for migrations |
| `JWT_SECRET` | yes | Random string, at least 32 characters |
| `FRONTEND_URL` | yes | Exact Netlify origin, no trailing slash, e.g. `https://my-journal.netlify.app`. Comma-separate several origins. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_USERNAME`, `ADMIN_FULL_NAME` | for first admin | See section 6 |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | optional | Sends password-reset emails. Without it, admins generate reset links in the Admin Panel. |

### Frontend (`frontend/.env`, or the Netlify dashboard)

| Variable | Meaning |
|----------|---------|
| `VITE_API_URL` | `https://YOUR-RENDER-BACKEND-URL.onrender.com/api` (must end with `/api`) |

Never commit `.env` files (`.gitignore` already excludes them).

---

## 6. Creating the initial administrator

There is no public "become admin" feature and no admin password in the code. The first admin is created from environment variables only:

1. Set `ADMIN_EMAIL`, `ADMIN_USERNAME` and a strong `ADMIN_PASSWORD` in the backend environment.
2. Start the server (it runs the setup automatically on boot) **or** run `npm run seed:admin`.
3. Log in with that email/username and password. You land on `/admin`.
4. After the account exists you may **remove `ADMIN_PASSWORD`** from the environment.

Behaviour: if no user has that email, the admin is created. If a user with that email already exists, it is promoted to `ADMIN` but its password is never changed. Further administrators are created by an existing admin: User Management → open user → Role.

Safeguards: an admin cannot change their own role/status, and the last active admin cannot be demoted or deactivated.

---

## 7. Deployment

Deploy in this order: **Neon → Render → Netlify → back to Render** (to set the final frontend URL).

### 7.1 Neon (database)

Done in section 4.1. Keep the pooled and direct strings at hand.

### 7.2 Backend on Render

1. Push the project to a GitHub repository (the whole `FOREX-TRADING-JOURNAL` folder is the repo).
2. Render → **New → Web Service** → connect the repo.
3. Settings:
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`  (this runs `prisma generate` and `prisma migrate deploy`, so tables are created on every deploy)
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`
4. Environment variables: `NODE_ENV=production`, `PORT=10000`, `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `FRONTEND_URL` (temporary value is fine, fix it in 7.4), `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`.
5. Deploy. Open `https://YOUR-SERVICE.onrender.com/api/health` → `{"status":"ok"}` and `/api/health/db` → `{"status":"ok"…}`.

> Render's free plan sleeps after inactivity; the first request can take 30–60 seconds. The app waits up to 45 seconds and then shows a "try again" message.

An optional blueprint is provided in `backend/render.yaml`.

### 7.3 Frontend on Netlify

1. Netlify → **Add new site → Import from Git** → select the repo.
2. `netlify.toml` already contains everything: base directory `frontend`, build command, publish directory `dist`, and the SPA redirect (`/* → /index.html 200`), so refreshing any route works.
3. **Site configuration → Environment variables:** add `VITE_API_URL = https://YOUR-SERVICE.onrender.com/api`.
4. Deploy. Environment variables are read at build time, so **redeploy after changing it**.

### 7.4 Connect them (CORS)

Copy your Netlify URL (e.g. `https://my-journal.netlify.app`, no trailing slash) into Render's `FRONTEND_URL` and save. Render restarts the service. Password-reset links also use the first URL in this variable.

For Netlify deploy previews or a custom domain, list every origin: `FRONTEND_URL=https://my-journal.netlify.app,https://journal.example.com`.

---

## 8. Backup and recovery (admins)

Neon keeps a point-in-time history (see Neon → Branches → Restore) and you should also keep your own dumps.

```bash
# backup (needs pg_dump). Writes backups/forex-journal-<timestamp>.dump
cd backend
DIRECT_URL="postgresql://…direct…" npm run backup

# restore: into a NEW, EMPTY Neon database or branch (never over live data)
TARGET_URL="postgresql://…direct-of-empty-db…" sh scripts/restore.sh backups/forex-journal-XXXX.dump
```

After restoring, check `SELECT count(*) FROM trades;`, then point `DATABASE_URL` / `DIRECT_URL` at the restored database. Dumps contain every user's data: store them privately. Users can export their own data at any time (CSV and full JSON history).

---

## 9. Acceptance checklist (run this after deploying)

Work through it with two browsers, or one normal and one private window.

1. `/api/health` and `/api/health/db` return `ok`.
2. Open the Netlify site, register a new account. You land on the dashboard.
3. Add a trade with a screenshot. It appears in the Journal; the dashboard numbers match.
4. Edit the trade (change the exit price and P/L), then delete a second test trade.
5. **Persistence:** log out, close the browser, log in again. The trades and screenshot are still there.
6. **Server restart:** in Render choose Manual Deploy → Restart. Log in again; the data is still there.
7. **Other device:** log in from a phone. Same data and the same saved language.
8. Switch to فارسی: text, forms, tables and the layout flip to RTL. Log out and in: the language persists.
9. Register a second user; confirm they cannot see the first user's trades. Opening `/app/journal/<first user's trade id>` shows "Trade not found".
10. As a normal user, open `/admin`: you are redirected away. As the admin: users list, role/status change, activity logs and system status all load.
11. Journal → Export CSV opens in Excel with correct Persian text. Reports → Save as PDF works.
12. Check Neon console → Tables: `users`, `trades`, … contain your rows.

---

## 10. Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| Browser console: CORS error, requests blocked | `FRONTEND_URL` on Render differs from the Netlify origin (typo, `http` vs `https`, trailing slash). Fix, wait for restart. |
| Login page says "Cannot reach the server" | `VITE_API_URL` missing or wrong on Netlify (must end with `/api`), or you did not redeploy after setting it. Or Render is waking up: retry. |
| Render build fails at `prisma migrate deploy` | `DIRECT_URL` missing/incorrect, or missing `sslmode=require`. Use the direct (non-pooler) string for `DIRECT_URL`. |
| `Environment variable not found: DIRECT_URL` | Prisma needs `DIRECT_URL` for every command, even locally. Set it (it may equal `DATABASE_URL`). |
| `Can't reach database server` at start | Neon was suspended: retry after a few seconds. Check the string and `sslmode=require`. |
| Errors mentioning prepared statements / pgbouncer | `DATABASE_URL` is the pooled string but lacks `pgbouncer=true`. |
| `Missing required environment variable: JWT_SECRET` | Set it in Render (32+ characters in production). |
| Cannot log in as admin | `ADMIN_EMAIL` / `ADMIN_PASSWORD` were not set when the server started. Set them and restart, or run `npm run seed:admin`. Check Render logs for `[admin]`. |
| Refreshing a page on Netlify shows 404 | `netlify.toml` must be at the repository root and the `_redirects` file must exist in `frontend/public`. |
| Reset email never arrives | SMTP is not configured. Admin Panel → Users → open the user → "Generate password reset link". |
| 429 Too many requests | Rate limit (25 login attempts per 15 minutes per IP). Wait. |
| Image upload rejected | Only PNG, JPEG, WebP up to 4 MB, 5 per trade. The file type is checked from the file's content, not its name. |
| Persian text looks wrong in the PDF | Use the browser's "Save as PDF" in the print dialog (Chrome / Edge), which handles Persian shaping correctly. |

---

## 11. REST API summary

All routes are under `/api`. Authenticated routes need `Authorization: Bearer <token>`.

- **Auth:** `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `GET /auth/me`
- **Trades:** `GET /trades` (filters: `q, from, to, pair, direction, session, result, sort, page, pageSize`), `POST /trades`, `GET|PUT|DELETE /trades/:id`, `GET /trades/meta`, `POST /trades/:id/attachments`, `GET|DELETE /trades/:id/attachments/:attId`
- **Analytics** (`range=today|week|month|lastMonth|year|all|custom`, `from`, `to`): `GET /analytics/overview|monthly|pairs|sessions|psychology`
- **Users:** `GET|PUT /users/profile`, `PUT /users/settings`, `PUT /users/password`
- **Data:** `GET /data/trades.csv`, `GET /data/history.json`
- **Admin** (ADMIN only): `GET /admin/dashboard`, `GET /admin/users`, `GET|PUT /admin/users/:id`, `POST /admin/users/:id/reset-link`, `GET /admin/activity-logs`, `GET /admin/system`, `GET|PUT /admin/settings`
- **Public:** `GET /health`, `GET /health/db`, `GET /settings/public`

Errors always look like `{ "error": { "code": "…", "message": "…", "details": [{ "field", "message" }] } }`; the frontend translates the `code`.

## 12. Security notes

bcrypt (cost 12) password hashing; JWT (1 day, or 30 days with "Remember me"); the user is reloaded from the database on every request, so suspension, role changes and password changes take effect immediately; changing or resetting a password signs out all other devices; reset tokens are random, stored only as SHA-256 hashes, single-use and expire after 1 hour; the "forgot password" response never reveals whether an email exists; Helmet headers; CORS allow-list; rate limiting on the API, on login/reset (stricter) and on uploads; Zod validation on every input; uploads are verified by magic bytes and served with `nosniff` and a sandbox CSP; CSV export neutralises spreadsheet formula injection; all secrets come from environment variables.

## 13. How the numbers are calculated

Also shown in the in-app Help page. Win rate = wins ÷ all trades (break-even trades count in the total). Profit factor = total profit ÷ total loss. Average R:R = mean of recorded R:R. If you leave P/L, result, balance after, R:R or risk % empty, they are computed from your other fields; values you type are never overwritten. Current balance = "balance after" of your latest trade, otherwise starting balance + total P/L. Streaks are ordered by date then entry time, and a break-even trade ends a streak.

Dates are shown with the Gregorian calendar (Latin digits) in both languages.
