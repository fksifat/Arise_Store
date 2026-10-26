#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 - <<'PY'
from pathlib import Path
import secrets, os
path = Path('.env')
if not path.exists():
    content = Path('.env.example').read_text()
    content = content.replace('SECRET_KEY=GENERATE_WITH_SETUP_SCRIPT', 'SECRET_KEY=' + secrets.token_hex(32))
    content = content.replace('POSTGRES_PASSWORD=GENERATE_WITH_SETUP_SCRIPT', 'POSTGRES_PASSWORD=' + secrets.token_hex(24))
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as output:
        output.write(content)
    print('Created .env with random local secrets')
else:
    print('Using existing .env')
Path('.data').mkdir(exist_ok=True)
PY
if [[ "${1:-}" == "--env-only" ]]; then exit 0; fi
if [[ "${1:-}" == "--docker" ]]; then
  docker compose up --build -d --wait
  echo 'Local app: http://localhost:3000'
  exit 0
fi
if [[ ! -x venv/bin/python ]]; then python3 -m venv venv; fi
venv/bin/python -m pip install -r services/api/requirements-dev.txt
venv/bin/alembic -c services/api/alembic.ini upgrade head
PYTHONPATH=services/api venv/bin/python -m app.manage seed
(cd apps/web && npm ci)
echo 'Setup complete. Start with: bash scripts/run-local.sh'
