#!/usr/bin/env bash
# Soft-launch smoke checks for Kept (domain + optional Pixel).
# Usage:
#   ./scripts/verify-soft-launch.sh
#   ./scripts/verify-soft-launch.sh https://keptapp.ca
#   PIXEL_ID=CXXXX ./scripts/verify-soft-launch.sh https://keptapp.ca

set -euo pipefail

BASE="${1:-https://kept-eosin.vercel.app}"
BASE="${BASE%/}"
FAIL=0
NOTES=()
PIXEL_OK=0
ON_CUSTOM=0

ok() { printf '  OK  %s\n' "$1"; }
bad() { printf '  FAIL %s\n' "$1"; FAIL=1; }
note() { NOTES+=("$1"); printf '  NOTE %s\n' "$1"; }

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
welcome=$(curl -sL "$BASE/welcome" || true)

if echo "$html" | grep -qi 'Scan it\. Clean it\. Keep it\|Kept'; then
  ok "brand/tagline present on /"
else
  bad "brand/tagline missing on /"
fi

if echo "$welcome" | grep -qi 'Get Started' \
  && echo "$welcome" | grep -qi 'Privacy' \
  && echo "$welcome" | grep -qi 'Terms' \
  && echo "$welcome" | grep -qi 'mailto:keptscan@gmail.com\|Contact'; then
  ok "/welcome has Get Started + Privacy/Terms + Contact"
else
  bad "/welcome missing Get Started, Privacy/Terms, or Contact email"
fi

if [[ -n "${PIXEL_ID:-}" ]]; then
  # Require the real ID in HTML or linked JS. Matching "TikTokPixel" alone is a
  # false positive while the env is still empty. Check chunks one-by-one — a
  # giant concatenated payload can exceed ARG_MAX and make grep falsely fail.
  found=0
  if printf '%s' "$html$welcome" | grep -Fq "$PIXEL_ID"; then
    found=1
  else
    while IFS= read -r src; do
      [[ -z "$src" ]] && continue
      case "$src" in
        http*) url="$src" ;;
        /*) url="$BASE$src" ;;
        *) url="$BASE/$src" ;;
      esac
      if curl -sL --max-time 8 "$url" | grep -Fq "$PIXEL_ID"; then
        found=1
        break
      fi
    done < <(printf '%s' "$html$welcome" | grep -oE 'src="[^"]+\.js[^"]*"' | sed 's/^src="//;s/"$//' | awk '!a[$0]++' | head -n 20)
  fi

  if [[ "$found" -eq 1 ]]; then
    ok "Pixel ID $PIXEL_ID found in HTML/JS payload"
    PIXEL_OK=1
  else
    bad "Pixel ID $PIXEL_ID not in payload — set NEXT_PUBLIC_TIKTOK_PIXEL_ID on Vercel Production and redeploy"
  fi
else
  if echo "$html$welcome" | grep -qi 'analytics.tiktok.com\|ttq.load'; then
    ok "TikTok analytics script present"
    PIXEL_OK=1
  else
    note "Pixel still off (set PIXEL_ID=... to assert; empty env keeps pixel off)"
  fi
fi

host=$(echo "$BASE" | sed -E 's#https?://##; s#/.*##')
if [[ "$host" == "keptapp.ca" || "$host" == "www.keptapp.ca" ]]; then
  ok "checking custom domain origin"
  ON_CUSTOM=1
elif [[ "$host" == *vercel.app* ]]; then
  note "still on vercel.app — buy/attach keptapp.ca, set NEXT_PUBLIC_APP_URL, redeploy, re-run"
fi

echo
remaining=()
if [[ "$PIXEL_OK" -ne 1 ]]; then
  remaining+=("Ads Manager Pixel → NEXT_PUBLIC_TIKTOK_PIXEL_ID → redeploy")
fi
remaining+=("Traffic ad Active/Delivering + soft post (Ads Manager — never a git-preview URL)")
if [[ "$ON_CUSTOM" -ne 1 ]]; then
  remaining+=("Buy+attach keptapp.ca → NEXT_PUBLIC_APP_URL → redeploy (parallel OK)")
fi
remaining+=("Stripe Dashboard Public details → Kept (Checkout header already forced in app)")

echo "Remaining Marshall gates:"
i=1
for g in "${remaining[@]}"; do
  printf '  %d. %s\n' "$i" "$g"
  i=$((i + 1))
done

if [[ "$FAIL" -ne 0 ]]; then
  echo "Result: FAIL"
  exit 1
fi
echo "Result: PASS"
exit 0
