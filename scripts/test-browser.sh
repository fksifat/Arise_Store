#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
e2e_run_id="$(python3 -c 'import uuid;print(uuid.uuid4().hex[:16])')"
cleanup() {
  docker compose exec -T -e E2E_RUN_ID="$e2e_run_id" api python - <<'PY'
import os
from sqlalchemy import delete, select, or_
from app.database import SessionLocal
from app.models.user import User
from app.models.shop import Shop
from app.models.audit import AuditLog

run = os.environ['E2E_RUN_ID']
emails = [f'e2e-{run}-{kind}@example.com' for kind in ('registration','checkout','usability','themes','dashboard','promotions','operations','polish')]
with SessionLocal() as db:
    users = db.scalars(select(User.id).where(User.email.in_(emails))).all()
    shops = db.scalars(select(Shop.id).where(Shop.owner_user_id.in_(users))).all()
    db.execute(delete(AuditLog).where(or_(AuditLog.actor_user_id.in_(users), AuditLog.shop_id.in_(shops))))
    db.execute(delete(User).where(User.id.in_(users)))
    db.commit()
    print(f'Browser test cleanup: removed {len(users)} temporary accounts and their audit events.')
PY
}
trap cleanup EXIT
cd apps/web
E2E_RUN_ID="$e2e_run_id" npm run test:e2e -- "$@"
