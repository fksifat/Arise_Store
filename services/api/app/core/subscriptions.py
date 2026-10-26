from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.subscription import Subscription


def active_subscription(db: Session, shop_id: str) -> Subscription:
    sub = db.query(Subscription).filter(Subscription.shop_id == shop_id).order_by(Subscription.created_at.desc()).first()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if not sub or sub.status not in ("trial", "active") or sub.current_period_end.replace(tzinfo=None) <= now:
        raise HTTPException(403, "An active subscription is required. Contact billing to renew.")
    return sub
