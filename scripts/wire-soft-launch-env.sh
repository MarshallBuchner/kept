#!/usr/bin/env bash
# Wire soft-launch Production env on Vercel, then redeploy.
#
# Usage (Marshall, from a machine with a Vercel token):
#   export VERCEL_TOKEN=vercel_…          # Account Settings → Tokens
#   export VERCEL_TEAM_ID=team_…          # optional; team powr4 if required
#   export PIXEL_ID=YOUR_TIKTOK_PIXEL_ID  # required unless APP_URL only
#   # optional after DNS:
#   export APP_URL=https://keptapp.ca
#   ./scripts/wire-soft-launch-env.sh
#
# Creates/updates Production env vars and redeploys the latest production
# deployment so NEXT_PUBLIC_* values bake into the build.

set -euo pipefail

PROJECT="${VERCEL_PROJECT:-kept}"
API="https://api.vercel.com"
AUTH_HEADER="Authorization: Bearer ${VERCEL_TOKEN:?Set VERCEL_TOKEN (Vercel → Account Settings → Tokens)}"

team_qs=""
if [[ -n "${VERCEL_TEAM_ID:-}" ]]; then
  team_qs="teamId=${VERCEL_TEAM_ID}"
fi

api() {
  local method=$1 path=$2
  shift 2
  local url="$API$path"
  if [[ -n "$team_qs" ]]; then
    if [[ "$url" == *\?* ]]; then
      url="$url&$team_qs"
    else
      url="$url?$team_qs"
    fi
  fi
  curl -sS -X "$method" -H "$AUTH_HEADER" -H "Content-Type: application/json" "$@" "$url"
}

if [[ -z "${PIXEL_ID:-}" && -z "${APP_URL:-}" ]]; then
  echo "Set PIXEL_ID and/or APP_URL" >&2
  exit 1
fi

echo "Resolving project '$PROJECT'…"
proj_json=$(api GET "/v9/projects/${PROJECT}")
proj_id=$(python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('id') or '')" <<<"$proj_json")
if [[ -z "$proj_id" ]]; then
  echo "Could not resolve project. Response:" >&2
  echo "$proj_json" >&2
  echo "Hint: set VERCEL_TEAM_ID for team powr4, or VERCEL_PROJECT=prj_…" >&2
  exit 1
fi
echo "  project id: $proj_id"

envs=()
if [[ -n "${PIXEL_ID:-}" ]]; then
  envs+=("{\"key\":\"NEXT_PUBLIC_TIKTOK_PIXEL_ID\",\"value\":$(python3 -c "import json,os; print(json.dumps(os.environ['PIXEL_ID']))"),\"type\":\"plain\",\"target\":[\"production\"],\"comment\":\"Kept soft-launch TikTok Pixel\"}")
fi
if [[ -n "${APP_URL:-}" ]]; then
  envs+=("{\"key\":\"NEXT_PUBLIC_APP_URL\",\"value\":$(python3 -c "import json,os; print(json.dumps(os.environ['APP_URL']))"),\"type\":\"plain\",\"target\":[\"production\"],\"comment\":\"Kept soft-launch public origin\"}")
fi

body="[$(IFS=,; echo "${envs[*]}")]"
echo "Upserting Production env…"
upsert=$(api POST "/v10/projects/${proj_id}/env?upsert=true" -d "$body")
python3 -c "import json,sys; d=json.load(sys.stdin); err=d.get('error');
print('  error:', err) if err else print('  ok:', [e.get('key') for e in (d if isinstance(d,list) else d.get('created', d.get('envs', [d])))])" <<<"$upsert"

echo "Finding latest production deployment to redeploy…"
deps=$(api GET "/v6/deployments?projectId=${proj_id}&target=production&limit=1")
dep_id=$(python3 -c "import json,sys; d=json.load(sys.stdin); deps=d.get('deployments') or []; print(deps[0]['uid'] if deps else '')" <<<"$deps")
if [[ -z "$dep_id" ]]; then
  echo "No production deployment found to redeploy. Env is set — trigger Redeploy in the Vercel UI." >&2
  exit 0
fi
echo "  redeploying $dep_id …"
redeploy=$(api POST "/v13/deployments" -d "{\"name\":\"${PROJECT}\",\"deploymentId\":\"${dep_id}\",\"target\":\"production\"}")
python3 -c "import json,sys; d=json.load(sys.stdin); print('  new deployment:', d.get('id') or d.get('url') or d.get('error') or d)" <<<"$redeploy"

echo
echo "Next:"
echo "  PIXEL_ID=${PIXEL_ID:-…} ./scripts/verify-soft-launch.sh ${APP_URL:-https://kept-eosin.vercel.app}"
echo "  Events Manager → Test Events: /welcome Get Started → CompleteRegistration"
