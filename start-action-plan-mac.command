#!/usr/bin/env bash
set -e

# macOS launcher: starts the dev server and opens the app in the browser
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=3000
BROWSER_URL="http://localhost:${PORT}"

open_browser() {
  echo "Opening browser: $BROWSER_URL"

  if command -v open >/dev/null 2>&1; then
    open -a "Google Chrome" "$BROWSER_URL" || \
    open -a "Chrome" "$BROWSER_URL" || \
    open -a "Safari" "$BROWSER_URL" || \
    open -a "Chromium" "$BROWSER_URL" || \
    open "$BROWSER_URL"
  elif command -v python3 >/dev/null 2>&1; then
    python3 -m webbrowser "$BROWSER_URL"
  elif command -v python >/dev/null 2>&1; then
    python -m webbrowser "$BROWSER_URL"
  else
    echo "Could not auto-open browser. Please open: $BROWSER_URL"
  fi
}

is_ready() {
  curl -fsS --max-time 2 "$BROWSER_URL" >/dev/null 2>&1
}

clear_stale_port() {
  if lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $PORT is already in use. Clearing stale listener..."
    lsof -tiTCP:"$PORT" -sTCP:LISTEN | while read -r pid; do
      if [ -n "$pid" ]; then
        kill -9 "$pid" || true
      fi
    done
  fi
}

cd "$REPO_DIR"

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies (node_modules missing)..."
  npm install
fi

if is_ready; then
  echo "App already responding on $BROWSER_URL"
  open_browser
  exit 0
fi

clear_stale_port

echo "Starting dev server (npm run dev)..."
PORT="$PORT" npm run dev -- --hostname 127.0.0.1 &
DEV_PID=$!

echo "Waiting for $BROWSER_URL to become available..."
for i in {1..90}; do
  if is_ready; then
    open_browser
    exit 0
  fi
  sleep 1
done

echo "Server did not become available in time. Dev server PID: $DEV_PID"
echo "You can open $BROWSER_URL manually or check the terminal for logs."
exit 1
