#!/bin/sh
# Restore a backup made by backup.sh.
# SAFE DEFAULT: restore into a NEW, empty Neon database / branch, verify it, then point DATABASE_URL at it.
# Usage:  TARGET_URL="postgresql://...(direct, empty database)" sh scripts/restore.sh backups/file.dump
set -eu
: "${TARGET_URL:?Set TARGET_URL to the direct connection string of the EMPTY database to restore into}"
FILE="${1:?Pass the .dump file to restore}"
echo "About to restore $FILE into the database in TARGET_URL."
printf "Type YES to continue: "
read -r ANSWER
[ "$ANSWER" = "YES" ] || { echo "Aborted."; exit 1; }
pg_restore --no-owner --no-privileges --exit-on-error --dbname="$TARGET_URL" "$FILE"
echo "Restore finished. Verify with: psql \"\$TARGET_URL\" -c 'SELECT count(*) FROM trades;'"
