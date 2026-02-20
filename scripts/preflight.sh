#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

ok() {
  echo "OK: $*"
}

info() {
  echo "INFO: $*"
}

read_env_var() {
  local key="$1"
  local line
  line="$(grep -E "^${key}=" .env.local | tail -n 1 || true)"
  if [[ -z "$line" ]]; then
    echo ""
    return
  fi
  echo "${line#*=}" | sed -e 's/^"//' -e 's/"$//'
}

extract_project_ref() {
  local url="$1"
  url="${url#https://}"
  url="${url#http://}"
  echo "${url%%.*}"
}

if [[ ! -f .env.local ]]; then
  fail "Missing .env.local. Copy .env.example first."
fi

SUPABASE_URL="$(read_env_var NEXT_PUBLIC_SUPABASE_URL)"
if [[ -z "$SUPABASE_URL" || "$SUPABASE_URL" == *"your_supabase_project_url"* ]]; then
  fail "NEXT_PUBLIC_SUPABASE_URL is missing or still using placeholder."
fi

for key in NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY; do
  value="$(read_env_var "$key")"
  if [[ -z "$value" ]]; then
    fail "$key is missing in .env.local."
  fi
done

if [[ -x ./gh ]]; then
  GH_BIN="./gh"
elif command -v gh >/dev/null 2>&1; then
  GH_BIN="gh"
else
  fail "GitHub CLI not found (gh)."
fi

if ! "$GH_BIN" auth status -h github.com >/dev/null 2>&1; then
  fail "GitHub CLI is not authenticated."
fi
ok "GitHub auth OK."

if command -v supabase >/dev/null 2>&1; then
  SUPABASE_CMD=(supabase)
else
  SUPABASE_CMD=(npx supabase)
fi

"${SUPABASE_CMD[@]}" --version >/dev/null
"${SUPABASE_CMD[@]}" projects list --output json >/dev/null
ok "Supabase CLI auth OK."

LINKED_REF="$(cat supabase/.temp/project-ref 2>/dev/null || true)"
if [[ -z "$LINKED_REF" ]]; then
  fail "No linked Supabase project found. Run: npx supabase link --project-ref <ref>"
fi

ENV_REF="$(extract_project_ref "$SUPABASE_URL")"
if [[ "$ENV_REF" != "$LINKED_REF" ]]; then
  fail "Supabase ref mismatch (.env.local=$ENV_REF, linked=$LINKED_REF). Run: npx supabase link --project-ref $ENV_REF"
fi
ok "Supabase linked project matches .env.local ($ENV_REF)."

if [[ ! -d node_modules ]]; then
  info "node_modules missing. Installing dependencies..."
  npm install
fi

info "Running type-check..."
npm run type-check

info "Running lint..."
npm run lint

info "Running Supabase db push dry-run..."
"${SUPABASE_CMD[@]}" db push --dry-run --yes >/tmp/ai-nutrition-supabase-dry-run.log
ok "Supabase dry-run OK."

ok "Preflight complete. Environment is ready."
echo "Dry-run log: /tmp/ai-nutrition-supabase-dry-run.log"
