#!/usr/bin/env bash
set -e

# macOS launcher: starts the dev server and opens the app in the browser
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$REPO_DIR"

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies (node_modules missing)..."
  npm install
fi

echo "Starting dev server (npm run dev)..."
npm run dev &
DEV_PID=$!

echo "Waiting for http://localhost:3000 to become available..."
for i in {1..60}; do
  if curl -sSf http://localhost:3000 >/dev/null 2>&1; then
    open "http://localhost:3000"
    exit 0
  fi
  sleep 1
done

echo "Server did not become available in time. Dev server PID: $DEV_PID"
echo "You can open http://localhost:3000 manually or check the terminal for logs."
exit 1
