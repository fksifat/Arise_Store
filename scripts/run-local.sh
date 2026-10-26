#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ ! -f .env || ! -x venv/bin/uvicorn ]]; then
  echo 'Run bash scripts/setup-local.sh first' >&2
  exit 1
fi
read -r arise_app_env arise_demo_enabled < <(PYTHONPATH=services/api venv/bin/python -c 'from app.config import settings; print(settings.APP_ENV, str(settings.SEED_DEMO_DATA).lower())')
export APP_ENV="$arise_app_env" SEED_DEMO_DATA="$arise_demo_enabled"
venv/bin/uvicorn app.main:app --app-dir services/api --host 127.0.0.1 --port 8000 --no-access-log &
api_pid=$!
(cd apps/web && exec npm run dev) &
web_pid=$!
trap 'kill "$api_pid" "$web_pid" 2>/dev/null || true' EXIT INT TERM
wait -n "$api_pid" "$web_pid"
