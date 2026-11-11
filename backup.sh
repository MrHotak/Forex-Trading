#!/bin/sh
# Full logical backup of the Neon database (schema + data, including screenshots).
# Requires: pg_dump (PostgreSQL client 15+). Uses the DIRECT (non-pooled) connection string.
# Usage:  DIRECT_URL="postgresql://..." sh scripts/backup.sh [output-dir]
set -eu
: "${DIRECT_URL:?Set DIRECT_URL to the direct (non-pooled) Neon connection string}"
OUT_DIR="${1:-./backups}"
mkdir -p "$OUT_DIR"
FILE="$OUT_DIR/forex-journal-$(date +%Y%m%d-%H%M%S).dump"
pg_dump --format=custom --no-owner --no-privileges --file="$FILE" "$DIRECT_URL"
echo "Backup written to $FILE"
echo "Store it somewhere private and off this machine. It contains all users' data."
