#!/usr/bin/env bash
# Xcode Cloud: uniquify CFBundleVersion for TestFlight uploads.
# Info.plist uses $(CURRENT_PROJECT_VERSION) from the Xcode project.
set -euo pipefail

ROOT="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$(dirname "$0")/../../.." && pwd)}"
PBX="$ROOT/ios/App/App.xcodeproj/project.pbxproj"

echo "== Xcode Cloud pre-xcodebuild =="
echo "CI_BUILD_NUMBER=${CI_BUILD_NUMBER:-unset}"

if [[ -z "${CI_BUILD_NUMBER:-}" ]]; then
  echo "CI_BUILD_NUMBER not set — leaving CURRENT_PROJECT_VERSION unchanged"
  exit 0
fi

if [[ ! -f "$PBX" ]]; then
  echo "Missing $PBX" >&2
  exit 1
fi

# macOS sed (Xcode Cloud)
sed -i '' "s/CURRENT_PROJECT_VERSION = [0-9][0-9]*;/CURRENT_PROJECT_VERSION = ${CI_BUILD_NUMBER};/g" "$PBX"

echo "Set CURRENT_PROJECT_VERSION → $CI_BUILD_NUMBER"
rg "CURRENT_PROJECT_VERSION" "$PBX" || grep "CURRENT_PROJECT_VERSION" "$PBX"
