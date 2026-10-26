import json
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.user import User
from app.models.shop import Shop
from app.models.catalog import Product
from app.models.order import Order
from app.models.subscription import Subscription, Payment, Plan
from app.schemas.subscription import PaymentResponse, VerifyPaymentRequest
from app.models.audit import AuditLog
from app.core.tenant import require_platform_admin
from app.schemas.shop import ShopResponse
from app.schemas.admin import AdminMetricsResponse, ShopStatusUpdate, AdminAuditLogResponse

router = APIRouter(prefix="/admin", tags=["Platform Administration"])

@router.get("/metrics", response_model=AdminMetricsResponse)
def get_platform_metrics(
    admin: User = Depends(require_platform_admin),
    db: Session = Depends(get_db)
):
    total_shops = db.query(Shop).count()
    published_shops = db.query(Shop).filter(Shop.status == "published").count()
    total_products = db.query(Product).filter(Product.status != "archived").count()
    total_orders = db.query(Order).count()
    
    gmv_res = db.query(func.sum(Order.total_minor)).filter(Order.status == "delivered").scalar() or 0
    
    # Estimate MRR from active subscriptions
    active_subs = db.query(Subscription).filter(Subscription.status == "active", Subscription.current_period_end > datetime.now(timezone.utc)).all()
    mrr_estimate = sum(
        sub.plan.price_monthly_minor if sub.billing_interval == "monthly" else sub.plan.price_annual_minor // 12
        for sub in active_subs if sub.plan
    )

    return AdminMetricsResponse(
        total_shops=total_shops,
        published_shops=published_shops,
        total_products=total_products,
        total_orders=total_orders,
        total_revenue_minor=int(gmv_res),
        mrr_estimate_minor=mrr_estimate
    )

@router.get("/shops", response_model=List[ShopResponse])
def admin_list_shops(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    admin: User = Depends(require_platform_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Shop)
    if status_filter:
        query = query.filter(Shop.status == status_filter)
    if search:
        query = query.filter(
            (Shop.name.ilike(f"%{search}%")) |
            (Shop.slug.ilike(f"%{search}%"))
        )
    shops = query.order_by(Shop.created_at.desc()).all()
    return [ShopResponse.model_validate(s) for s in shops]

@router.patch("/shops/{shop_id}/status", response_model=ShopResponse)
def admin_update_shop_status(
    shop_id: str,
    req: ShopStatusUpdate,
    admin: User = Depends(require_platform_admin),
    db: Session = Depends(get_db)
):
    shop = db.query(Shop).filter(Shop.id == shop_id).with_for_update().first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    old_status = shop.status
    shop.status = req.status

    # Record in AuditLog
    log = AuditLog(
        actor_user_id=admin.id,
        shop_id=shop.id,
        action=f"shop.status_change_from_{old_status}_to_{req.status}",
        resource_type="shop",
        resource_id=shop.id,
        details_json=json.dumps({"reason": req.reason, "old_status": old_status, "new_status": req.status})
    )
    db.add(log)
    db.commit()
    db.refresh(shop)

    return ShopResponse.model_validate(shop)

@router.get("/audit-logs", response_model=List[AdminAuditLogResponse])
def list_audit_logs(
    admin: User = Depends(require_platform_admin),
    db: Session = Depends(get_db)
):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()
    return [AdminAuditLogResponse.model_validate(l) for l in logs]

@router.get("/payments", response_model=List[PaymentResponse])
def pending_payments(admin: User = Depends(require_platform_admin), db: Session = Depends(get_db)):
    return db.query(Payment).filter(Payment.status == "pending").order_by(Payment.created_at.asc()).limit(100).all()

@router.post("/payments/{payment_id}/verify", response_model=PaymentResponse)
def verify_payment(payment_id: str, req: VerifyPaymentRequest, admin: User = Depends(require_platform_admin), db: Session = Depends(get_db)):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(404, "Payment not found")
    db.query(Shop).filter(Shop.id == payment.shop_id).with_for_update().one()
    db.refresh(payment, with_for_update=True)
    if payment.status == "completed":
        if payment.provider_reference != req.provider_reference:
            raise HTTPException(409, "Payment already verified with another reference")
        return payment
    if payment.status != "pending":
        raise HTTPException(409, "Only pending payments can be verified")
    plan = db.query(Plan).filter(Plan.id == payment.plan_id, Plan.is_active == True).first()
    if not plan or payment.billing_interval not in ("monthly", "annual"):
        raise HTTPException(409, "Payment plan is no longer available")
    now = datetime.now(timezone.utc)
    sub = db.query(Subscription).filter(Subscription.shop_id == payment.shop_id).order_by(Subscription.created_at.desc()).first()
    end = now + timedelta(days=365 if payment.billing_interval == "annual" else 30)
    if sub and sub.plan_id == plan.id and sub.status == "active" and sub.current_period_end.replace(tzinfo=timezone.utc) > now:
        end = sub.current_period_end.replace(tzinfo=timezone.utc) + timedelta(days=365 if payment.billing_interval == "annual" else 30)
    if not sub:
        sub = Subscription(shop_id=payment.shop_id, plan_id=plan.id, starts_at=now)
        db.add(sub)
    sub.plan_id, sub.status, sub.billing_interval = plan.id, "active", payment.billing_interval
    sub.current_period_start, sub.current_period_end = now, end
    sub.trial_ends_at, sub.cancelled_at = None, None
    db.flush()
    payment.subscription_id = sub.id
    payment.status, payment.verified_at, payment.provider_reference = "completed", now, req.provider_reference
    db.add(AuditLog(actor_user_id=admin.id, shop_id=payment.shop_id, action="payment.verified", resource_type="payment", resource_id=payment.id, details_json=json.dumps({"reason": req.reason, "reference": req.provider_reference, "amount_minor": payment.amount_minor})))
    db.commit()
    db.refresh(payment)
    return payment

@router.post("/payments/{payment_id}/reject", response_model=PaymentResponse)
def reject_payment(payment_id: str, req: VerifyPaymentRequest, admin: User = Depends(require_platform_admin), db: Session = Depends(get_db)):
    payment = db.query(Payment).filter(Payment.id == payment_id).with_for_update().first()
    if not payment:
        raise HTTPException(404, "Payment not found")
    if payment.status != "pending":
        raise HTTPException(409, "Only pending payments can be rejected")
    payment.status = "failed"
    db.add(AuditLog(actor_user_id=admin.id, shop_id=payment.shop_id, action="payment.rejected", resource_type="payment", resource_id=payment.id, details_json=json.dumps({"reason": req.reason})))
    db.commit()
    return payment

