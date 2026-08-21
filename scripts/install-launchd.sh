#!/usr/bin/env bash
set -euo pipefail

# Installs a launchd agent to run the project's headless start script at login/boot.
# Usage: chmod +x scripts/install-launchd.sh && ./scripts/install-launchd.sh

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PLIST_DIR="$HOME/Library/LaunchAgents"
LABEL="com.markdown-action-plan.headless"
PLIST_PATH="$PLIST_DIR/$LABEL.plist"
OUT_LOG="$HOME/Library/Logs/markdown-action-plan.out.log"
ERR_LOG="$HOME/Library/Logs/markdown-action-plan.err.log"

mkdir -p "$PLIST_DIR" "$HOME/Library/Logs"

cat > "$PLIST_PATH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$REPO_DIR/scripts/start-headless.sh</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$OUT_LOG</string>
  <key>StandardErrorPath</key>
  <string>$ERR_LOG</string>
  <key>WorkingDirectory</key>
  <string>$REPO_DIR</string>
</dict>
</plist>
PLIST

echo "Wrote $PLIST_PATH"

echo "(Re)loading launchd agent..."
launchctl unload "$PLIST_PATH" 2>/dev/null || true
launchctl load "$PLIST_PATH"

echo "Installed and loaded $LABEL. Logs: $OUT_LOG / $ERR_LOG"
