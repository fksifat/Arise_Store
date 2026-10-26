#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
bash -n scripts/setup-local.sh scripts/run-local.sh scripts/backup.sh scripts/test-postgres.sh scripts/test-browser.sh
docker compose config --quiet
bash scripts/test-postgres.sh
(cd apps/web && npm run build && npm audit)
venv/bin/pip-audit -r services/api/requirements.txt --progress-spinner off
