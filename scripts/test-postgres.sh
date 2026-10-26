#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose exec -T postgres sh -c 'if ! psql -U "$POSTGRES_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '\''arise_test'\''" | grep -q 1; then createdb -U "$POSTGRES_USER" arise_test; fi'
docker compose --profile test run --build --rm --no-deps test
