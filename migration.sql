-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "TradingSession" AS ENUM ('ASIAN', 'LONDON', 'NEW_YORK', 'SYDNEY');

-- CreateEnum
CREATE TYPE "TradeResult" AS ENUM ('WIN', 'LOSS', 'BREAK_EVEN');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('en', 'fa');

-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('dark', 'light');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "username" VARCHAR(40) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "password_changed_at" TIMESTAMPTZ(6),
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "language" "Language" NOT NULL DEFAULT 'en',
    "theme" "Theme" NOT NULL DEFAULT 'dark',
    "starting_balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trades" (
    "id" UUID NOT NULL,
    "trade_no" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "trade_date" DATE NOT NULL,
    "pair" VARCHAR(20) NOT NULL,
    "session" "TradingSession" NOT NULL,
    "direction" "Direction" NOT NULL,
    "entry_price" DECIMAL(18,6) NOT NULL,
    "exit_price" DECIMAL(18,6),
    "stop_loss" DECIMAL(18,6),
    "risk_amount" DECIMAL(18,2),
    "risk_percent" DECIMAL(7,3),
    "balance_before" DECIMAL(18,2),
    "balance_after" DECIMAL(18,2),
    "reason_for_entry" TEXT,
    "emotion" VARCHAR(200),
    "reason_for_exit" TEXT,
    "rr_achieved" DECIMAL(10,2),
    "lessons_learned" TEXT,
    "mistakes" TEXT,
    "profit_loss" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "result" "TradeResult" NOT NULL,
    "lot_size" DECIMAL(12,4),
    "commission" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "swap" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "strategy" VARCHAR(100),
    "setup" VARCHAR(100),
    "entry_time" VARCHAR(5),
    "exit_time" VARCHAR(5),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "trades_entry_price_nonneg" CHECK ("entry_price" >= 0),
    CONSTRAINT "trades_lot_size_nonneg" CHECK ("lot_size" IS NULL OR "lot_size" >= 0),
    CONSTRAINT "trades_risk_percent_range" CHECK ("risk_percent" IS NULL OR ("risk_percent" >= 0 AND "risk_percent" <= 100))
);

-- CreateTable
CREATE TABLE "trade_attachments" (
    "id" UUID NOT NULL,
    "trade_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "trade_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" SERIAL NOT NULL,
    "user_id" UUID,
    "action" VARCHAR(60) NOT NULL,
    "entity" VARCHAR(40),
    "entity_id" VARCHAR(64),
    "ip" VARCHAR(64),
    "user_agent" VARCHAR(255),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "key" VARCHAR(60) NOT NULL,
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_user_id_key" ON "user_settings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "trades_trade_no_key" ON "trades"("trade_no");

-- CreateIndex
CREATE INDEX "trades_user_id_trade_date_idx" ON "trades"("user_id", "trade_date");

-- CreateIndex
CREATE INDEX "trades_user_id_pair_idx" ON "trades"("user_id", "pair");

-- CreateIndex
CREATE INDEX "trades_user_id_result_idx" ON "trades"("user_id", "result");

-- CreateIndex
CREATE INDEX "trades_user_id_session_idx" ON "trades"("user_id", "session");

-- CreateIndex
CREATE INDEX "trade_attachments_trade_id_idx" ON "trade_attachments"("trade_id");

-- CreateIndex
CREATE INDEX "trade_attachments_user_id_idx" ON "trade_attachments"("user_id");

-- CreateIndex
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs"("created_at");

-- CreateIndex
CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs"("user_id");

-- CreateIndex
CREATE INDEX "activity_logs_action_idx" ON "activity_logs"("action");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_attachments" ADD CONSTRAINT "trade_attachments_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_attachments" ADD CONSTRAINT "trade_attachments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
