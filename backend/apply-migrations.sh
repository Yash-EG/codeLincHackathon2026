#!/usr/bin/env bash
#
# apply-migrations.sh — apply db/migrations/V1..V3 to Neon, in order.
#
# Reads MIGRATION_DATABASE_URL from backend/.env (a DIRECT, non-pooled Neon
# connection string). Never prints the connection string. Idempotency is NOT
# guaranteed by these SQL files, so run this once against a fresh database.
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$REPO_ROOT/backend/.env"
MIG_DIR="$REPO_ROOT/db/migrations"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found. Copy backend/.env.example and fill it in." >&2
  exit 1
fi

# Load env (only the vars we need); do not echo values.
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${MIGRATION_DATABASE_URL:?Set MIGRATION_DATABASE_URL in backend/.env (direct Neon URL)}"

echo "Applying migrations from $MIG_DIR ..."
for f in V1__schema.sql V2__seed_data.sql V3__appointments.sql; do
  echo "  -> $f"
  psql "$MIGRATION_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$MIG_DIR/$f"
done

echo "Migrations applied. Running verification queries (db/queries.sql):"
psql "$MIGRATION_DATABASE_URL" -f "$REPO_ROOT/db/queries.sql"
echo "Done."
