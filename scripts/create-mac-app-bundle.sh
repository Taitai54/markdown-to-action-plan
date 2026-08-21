#!/usr/bin/env bash
set -euo pipefail

# Creates a clickable .app bundle inside the repository called "Markdown Action Plan.app".
# This does not require Xcode or osacompile. Double-click the .app to open Terminal and run the launcher.

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_NAME="Markdown Action Plan"
APP_DIR="$REPO_DIR/$APP_NAME.app"
EXEC_NAME="launcher"

rm -rf "$APP_DIR"
mkdir -p "$APP_DIR/Contents/MacOS"

# Info.plist
cat > "$APP_DIR/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDisplayName</key>
  <string>$APP_NAME</string>
  <key>CFBundleName</key>
  <string>$APP_NAME</string>
  <key>CFBundleIdentifier</key>
  <string>com.markdown-action-plan.app</string>
  <key>CFBundleVersion</key>
  <string>0.1</string>
  <key>CFBundleExecutable</key>
  <string>$EXEC_NAME</string>
  <key>LSApplicationCategoryType</key>
  <string>public.app-category.developer-tools</string>
</dict>
</plist>
PLIST

# Executable that runs the repository launcher in a new Terminal window
cat > "$APP_DIR/Contents/MacOS/$EXEC_NAME" <<'SH'
#!/usr/bin/env bash
REPO_DIR="__REPO_DIR__"
cd "$REPO_DIR"
# open a new Terminal window and run the command script so logs are visible
osascript <<APP
tell application "Terminal"
    activate
    do script "cd \"$REPO_DIR\" && ./start-action-plan-mac.command"
end tell
APP
SH

# patch the placeholder with actual dir
sed -i '' "s#__REPO_DIR__#${REPO_DIR}#g" "$APP_DIR/Contents/MacOS/$EXEC_NAME"
chmod +x "$APP_DIR/Contents/MacOS/$EXEC_NAME"

echo "Created clickable app at: $APP_DIR"
echo "Double-click it in Finder or run: open '$APP_DIR'"
