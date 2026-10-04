#!/usr/bin/env bash
#
# start-db.sh — run the backend against Neon under the "db" Spring profile.
#
# Loads secrets from backend/.env (gitignored), exports them so the AWS default
# credential chain + Spring can read them, then boots the app. Never prints
# secret values.
#
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$BACKEND_DIR/.env"

# --- Prefer Java 21 (project targets 21) -----------------------------------
if [ -z "${JAVA_HOME:-}" ] && [ -d /usr/lib/jvm/java-21-openjdk-amd64 ]; then
  export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
fi
if [ -n "${JAVA_HOME:-}" ]; then
  export PATH="$JAVA_HOME/bin:$PATH"
fi
echo "Java: $(java -version 2>&1 | head -1)"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found. Copy backend/.env.example and fill it in." >&2
  exit 1
fi

# Load and export all vars from .env without echoing them.
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# Fail fast with clear messages if required values are missing.
: "${DATABASE_URL:?Set DATABASE_URL in backend/.env}"

# Credentials may be provided EITHER as separate vars (DATABASE_USERNAME /
# DATABASE_PASSWORD) OR embedded in DATABASE_URL as ?user=...&password=... query
# params. Only require the separate vars when the URL does not already carry them.
case "$DATABASE_URL" in
  *user=*password=*|*password=*user=*)
    : ;;  # creds embedded in the URL — nothing more needed
  *)
    : "${DATABASE_USERNAME:?Set DATABASE_USERNAME in backend/.env (or embed user=/password= in DATABASE_URL)}"
    : "${DATABASE_PASSWORD:?Set DATABASE_PASSWORD in backend/.env (or embed user=/password= in DATABASE_URL)}"
    ;;
esac
if [ -z "${AWS_BEARER_TOKEN_BEDROCK:-}" ]; then
  echo "WARNING: AWS_BEARER_TOKEN_BEDROCK is not set — /api/analyze explanations"
  echo "         and /api/ai/test will fail, but the app will still boot and price."
fi

export SPRING_PROFILES_ACTIVE=db

cd "$BACKEND_DIR"
echo "Starting backend under the 'db' profile on port ${SERVER_PORT:-8080} ..."
exec ./mvnw -q spring-boot:run
