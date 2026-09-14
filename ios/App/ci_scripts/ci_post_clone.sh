#!/usr/bin/env bash
# Xcode Cloud: CapApp-SPM resolves Capacitor plugins from node_modules paths.
# Without npm ci those packages are missing and Archive fails.
set -euo pipefail

export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
export HOMEBREW_NO_AUTO_UPDATE=1

# Repo root (this script lives at ios/App/ci_scripts/)
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

echo "== Xcode Cloud post-clone =="
echo "ROOT=$ROOT"

if ! command -v node >/dev/null 2>&1; then
  echo "Installing Node via Homebrew…"
  brew install node@22 || brew install node
  # Prefer node@22 keg if present
  if [[ -d /opt/homebrew/opt/node@22 ]]; then
    brew link --overwrite --force node@22 || true
  fi
fi

echo "node $(node -v) | npm $(npm -v)"

# Capgo / npm sometimes flake under high concurrency on Cloud
npm config set maxsockets 3
npm ci

# Ensure Capacitor iOS package metadata is synced (idempotent with committed ios/)
npx cap sync ios

echo "OK: node_modules ready for CapApp-SPM"
ls -d node_modules/@capacitor/app \
      node_modules/@capacitor/splash-screen \
      node_modules/@capacitor/status-bar \
      node_modules/@capgo/native-purchases
