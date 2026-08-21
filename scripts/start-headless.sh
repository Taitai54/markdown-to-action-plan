#!/usr/bin/env bash
set -euo pipefail

# Headless production start for mac/Linux
# - installs deps if missing
# - builds the Next.js app
# - starts `next start` in background with logs and PID

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

PORT=${PORT:-3000}
LOG_DIR="$REPO_DIR/logs"
PID_DIR="$REPO_DIR/tmp"
mkdir -p "$LOG_DIR" "$PID_DIR"

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install --production=false
fi

echo "Building app..."
npm run build

echo "Starting production server on port $PORT (headless)..."
nohup env PORT="$PORT" npm run start > "$LOG_DIR/headless.log" 2>&1 &
PID=$!
echo $PID > "$PID_DIR/headless.pid"
echo "Started (PID: $PID). Logs: $LOG_DIR/headless.log"
echo "To stop: kill $(cat "$PID_DIR/headless.pid")"
