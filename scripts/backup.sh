#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
umask 077
mkdir -p backups
backup_path="backups/arise-$(date -u +%Y%m%dT%H%M%SZ)-$$.dump"
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$backup_path"
if [[ ! -s "$backup_path" ]]; then echo 'Backup is empty' >&2; exit 1; fi
echo "Database backup: $backup_path"
