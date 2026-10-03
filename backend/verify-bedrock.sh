#!/usr/bin/env bash
#
# verify-bedrock.sh — end-to-end check of the Bedrock vertical slice.
#
# Run this from YOUR shell, where AWS_BEARER_TOKEN_BEDROCK is exported. It:
#   1. confirms Java 21 and the Bedrock bearer token are available,
#   2. builds and starts the Spring Boot app (no database needed),
#   3. hits GET /api/health,
#   4. hits POST /api/ai/test and checks the model responds,
#   5. shuts the app down.
#
# It does NOT commit, push, or modify any tracked files.

set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${SERVER_PORT:-8080}"
BASE="http://localhost:${PORT}"
LOG="$(mktemp -t bedrock-verify-XXXX.log)"

# --- Java 21 ---------------------------------------------------------------
if [ -z "${JAVA_HOME:-}" ] && [ -d /usr/lib/jvm/java-21-openjdk-amd64 ]; then
  export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
  export PATH="$JAVA_HOME/bin:$PATH"
fi
echo "Java: $(java -version 2>&1 | head -1)"

# --- Bedrock token ---------------------------------------------------------
if [ -z "${AWS_BEARER_TOKEN_BEDROCK:-}" ]; then
  echo "WARNING: AWS_BEARER_TOKEN_BEDROCK is not set. /api/ai/test will return a"
  echo "         clean 502 instead of a live model response. Export it and re-run"
  echo "         to verify the full round-trip."
fi

cd "$BACKEND_DIR"

echo "Building..."
mvn -q -B clean package -DskipTests

JAR="$(ls target/dental-backend-*.jar | head -1)"
echo "Starting $JAR on port $PORT ..."
java -jar "$JAR" > "$LOG" 2>&1 &
APP_PID=$!
trap 'kill "$APP_PID" 2>/dev/null || true' EXIT

# --- wait for health -------------------------------------------------------
for i in $(seq 1 45); do
  if [ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/health" 2>/dev/null)" = "200" ]; then
    echo "App is up after ${i}s."
    break
  fi
  sleep 1
done

echo
echo "== GET /api/health =="
curl -s "$BASE/api/health"; echo

echo
echo "== POST /api/ai/test =="
RESP="$(curl -s -X POST "$BASE/api/ai/test" \
  -H 'Content-Type: application/json' \
  -d '{"message":"Respond with exactly: Java Bedrock integration works."}')"
echo "$RESP"

echo
if echo "$RESP" | grep -q '"response"'; then
  echo "SUCCESS: Bedrock returned a response."
else
  echo "No model response (check that AWS_BEARER_TOKEN_BEDROCK is exported). App log:"
  grep -iE "bedrock|credential|error" "$LOG" | tail -5 || true
fi

echo
echo "App log: $LOG"
