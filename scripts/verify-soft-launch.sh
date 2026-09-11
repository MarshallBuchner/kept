#!/usr/bin/env bash
# Post-domain / post-pixel smoke checks for Kept soft launch.
# Usage:
#   ./scripts/verify-soft-launch.sh
#   ./scripts/verify-soft-launch.sh https://keptapp.ca
#   PIXEL_ID=CXXXX ./scripts/verify-soft-launch.sh https://keptapp.ca

set -euo pipefail

BASE="${1:-https://kept-eosin.vercel.app}"
BASE="${BASE%/}"
FAIL=0

ok() { printf '  OK  %s\n' "$1"; }
bad() { printf '  FAIL %s\n' "$1"; FAIL=1; }

echo "Soft-launch verify → $BASE"

for path in / /welcome /privacy /terms /og.png; do
  code=$(curl -sL -o /dev/null -w '%{http_code}' "$BASE$path" || true)
  if [[ "$code" == "200" ]]; then
    ok "$path → $code"
  else
    bad "$path → $code (want 200)"
  fi
done

html=$(curl -sL "$BASE/" || true)
if echo "$html" | grep -qi 'Scan it. Clean it. Keep it\|Kept'; then
  ok "brand/tagline present on /"
else
  bad "brand/tagline missing on /"
fi

if [[ -n "${PIXEL_ID:-}" ]]; then
  if echo "$html" | grep -q "$PIXEL_ID"; then
    ok "Pixel ID $PIXEL_ID found in HTML/JS payload"
  else
    # Pixel may be injected via afterInteractive chunk; check for loader fingerprint
    if echo "$html" | grep -qi 'TikTokPixel\|analytics.tiktok.com\|TiktokAnalyticsObject'; then
      ok "TikTok pixel loader referenced (confirm ID in TikTok Test Events)"
    else
      bad "Pixel ID not visible yet — set NEXT_PUBLIC_TIKTOK_PIXEL_ID on Vercel Production and redeploy"
    fi
  fi
else
  if echo "$html" | grep -qi 'analytics.tiktok.com'; then
    ok "TikTok analytics script present"
  else
    echo "  SKIP pixel body check (set PIXEL_ID=... to assert ID; empty env keeps pixel off)"
  fi
fi

host=$(echo "$BASE" | sed -E 's#https?://##')
if [[ "$host" == *vercel.app* ]]; then
  echo "  NOTE still on vercel.app — buy/attach keptapp.ca, then re-run with that origin"
fi

if [[ "$FAIL" -ne 0 ]]; then
  echo "Result: FAIL"
  exit 1
fi
echo "Result: PASS"
exit 0
