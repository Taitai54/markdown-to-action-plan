#!/usr/bin/env bash
set -euo pipefail

# Creates an AppleScript .app that launches the repository's mac command launcher
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_NAME="Markdown Action Plan Launcher"
APP_DIR="$HOME/Applications"
APP_PATH="$APP_DIR/$APP_NAME.app"

mkdir -p "$APP_DIR"

TMP_AS="$TMPDIR/launcher_$$.applescript"
cat > "$TMP_AS" <<AS
on run
    tell application "Terminal"
        do script "cd \"$REPO_DIR\" && ./start-action-plan-mac.command"
        activate
    end tell
end run
AS

if command -v osacompile >/dev/null 2>&1; then
  osacompile -o "$APP_PATH" "$TMP_AS"
  rm "$TMP_AS"
  echo "Created $APP_PATH"
  echo "You can find the launcher in $APP_PATH — double-click to run."
else
  echo "osacompile not found. Create the app manually using Script Editor or Automator." >&2
  echo "AppleScript file created at: $TMP_AS" >&2
fi
