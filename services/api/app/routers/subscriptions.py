import json
from datetime import datetime, timezone, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.shop import Shop
from app.models.subscription import Plan, Subscription, Payment
from app.core.tenant import require_shop_access
from app.schemas.subscription import PlanResponse, SubscriptionResponse, UpgradeSubscriptionRequest, PaymentResponse

router = APIRouter(tags=["Subscriptions"])

@router.get("/plans", response_model=List[PlanResponse])
def list_plans(db: Session = Depends(get_db)):
    plans = db.query(Plan).filter(Plan.is_active == True).all()
    results = []
    for p in plans:
        try:
            feats = json.loads(p.features_json)
        except Exception:
            feats = []
        results.append(PlanResponse(
            id=p.id,
            slug=p.slug,
            name=p.name,
            price_monthly_minor=p.price_monthly_minor,
            price_annual_minor=p.price_annual_minor,
            currency=p.currency,
            product_limit=p.product_limit,
            custom_domain_allowed=p.custom_domain_allowed,
            features=feats,
            is_active=p.is_active
        ))
    return results

@router.get("/shops/{shop_id}/subscription", response_model=SubscriptionResponse)
def get_shop_subscription(
    shop: Shop = Depends(require_shop_access),
    db: Session = Depends(get_db)
):
    sub = db.query(Subscription).filter(Subscription.shop_id == shop.id).order_by(Subscription.created_at.desc()).first()
    if not sub:
        raise HTTPException(status_code=404, detail="No subscription found for this shop")
    return SubscriptionResponse(
        id=sub.id,
        shop_id=sub.shop_id,
        plan_id=sub.plan_id,
        plan_name=sub.plan.name,
        status=sub.status,
        billing_interval=sub.billing_interval,
        starts_at=sub.starts_at,
        current_period_start=sub.current_period_start,
        current_period_end=sub.current_period_end,
        trial_ends_at=sub.trial_ends_at,
        cancelled_at=sub.cancelled_at
    )

@router.get("/shops/{shop_id}/payments", response_model=List[PaymentResponse])
def list_payments(shop: Shop = Depends(require_shop_access), db: Session = Depends(get_db)):
    return db.query(Payment).filter(Payment.shop_id == shop.id).order_by(Payment.created_at.desc()).limit(100).all()


@router.post("/shops/{shop_id}/subscriptions/upgrade", response_model=PaymentResponse, status_code=202)
def upgrade_subscription(req: UpgradeSubscriptionRequest, shop: Shop = Depends(require_shop_access), db: Session = Depends(get_db)):
    db.query(Shop).filter(Shop.id == shop.id).with_for_update().one()
    plan = db.query(Plan).filter(Plan.slug == req.plan_slug, Plan.is_active == True).first()
    if not plan:
        raise HTTPException(404, "Target subscription plan not found")
    pending = db.query(Payment).filter(Payment.shop_id == shop.id, Payment.status == "pending").first()
    if pending:
        if pending.plan_id != plan.id or pending.billing_interval != req.billing_interval:
            raise HTTPException(409, "A billing request is already pending. Contact the administrator to change it.")
        return pending
    amount = plan.price_annual_minor if req.billing_interval == "annual" else plan.price_monthly_minor
    payment = Payment(shop_id=shop.id, plan_id=plan.id, billing_interval=req.billing_interval,
        provider="manual", amount_minor=amount, currency=plan.currency, status="pending",
        verified_at=None, notes=f"Requested {plan.name}; awaiting administrator payment confirmation")
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment
