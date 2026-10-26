from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import update
import json
from app.models.audit import AuditLog
from app.models.user import User
from app.core.tenant import get_current_user
from app.database import get_db
from app.models.shop import Shop
from app.models.order import Order, OrderItem
from app.models.catalog import Product, ProductVariant
from app.core.tenant import require_shop_access
from app.core.order_snapshots import read_option_snapshot
from app.core.constants import ORDER_STATUSES, ORDER_TRANSITIONS
from app.schemas.order import OrderResponse, OrderItemResponse, OrderStatusUpdate

router = APIRouter(prefix="/shops/{shop_id}/orders", tags=["Orders"])

def _format_order_response(o: Order) -> OrderResponse:
    items = [
        OrderItemResponse(
            id=i.id,
            order_id=i.order_id,
            product_id=i.product_id,
            variant_id=i.variant_id,
            product_name_snapshot=i.product_name_snapshot,
            sku_snapshot=i.sku_snapshot,
            variant_snapshot_json=read_option_snapshot(i.variant_snapshot_json)[1],
            variant_title_snapshot=read_option_snapshot(i.variant_snapshot_json)[0],
            product_image_url_snapshot=i.product_image_url_snapshot,
            unit_price_minor=i.unit_price_minor,
            quantity=i.quantity,
            line_total_minor=i.line_total_minor
        ) for i in o.items
    ]
    return OrderResponse(
        id=o.id,
        shop_id=o.shop_id,
        order_number=o.order_number,
        status=o.status,
        payment_method=o.payment_method,
        payment_status=o.payment_status,
        subtotal_minor=o.subtotal_minor,
        delivery_fee_minor=o.delivery_fee_minor,
        discount_minor=o.discount_minor,
        total_minor=o.total_minor,
        currency=o.currency,
        customer_name=o.customer_name,
        customer_phone=o.customer_phone,
        customer_email=o.customer_email,
        shipping_city=o.shipping_city,
        shipping_address=o.shipping_address,
        customer_note=o.customer_note,
        admin_note=o.admin_note,
        created_at=o.created_at,
        updated_at=o.updated_at,
        items=items,
        allowed_statuses=ORDER_TRANSITIONS.get(o.status, [])
    )

@router.get("", response_model=List[OrderResponse])
def list_orders(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    shop: Shop = Depends(require_shop_access),
    db: Session = Depends(get_db)
):
    query = db.query(Order).filter(Order.shop_id == shop.id)
    if status_filter:
        query = query.filter(Order.status == status_filter)
    if search:
        query = query.filter(
            (Order.order_number.ilike(f"%{search}%")) |
            (Order.customer_name.ilike(f"%{search}%")) |
            (Order.customer_phone.ilike(f"%{search}%"))
        )
    orders = query.order_by(Order.created_at.desc()).all()
    return [_format_order_response(o) for o in orders]

@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: str,
    shop: Shop = Depends(require_shop_access),
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(Order.id == order_id, Order.shop_id == shop.id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return _format_order_response(order)

@router.patch("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: str,
    req: OrderStatusUpdate,
    actor: User = Depends(get_current_user),
    shop: Shop = Depends(require_shop_access),
    db: Session = Depends(get_db)
):
    db.query(Shop).filter(Shop.id == shop.id).with_for_update().one()
    order = db.query(Order).filter(Order.id == order_id, Order.shop_id == shop.id).populate_existing().with_for_update().first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    new_status = req.status.lower()
    if new_status not in ORDER_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid order status '{new_status}'")

    if new_status == order.status:
        return _format_order_response(order)
    old_status = order.status
    if new_status not in ORDER_TRANSITIONS.get(old_status, []):
        raise HTTPException(409, f"Cannot change order from {old_status} to {new_status}")
    changed = db.execute(update(Order).where(Order.id == order.id, Order.status == old_status).values(status=new_status), execution_options={"synchronize_session": False}).rowcount
    if changed != 1:
        raise HTTPException(409, "Order changed concurrently. Refresh and try again.")
    if new_status in ("cancelled", "returned"):
        for item in sorted(order.items, key=lambda i: (i.product_id or "", i.variant_id or "")):
            if not item.inventory_deducted:
                continue
            model = ProductVariant if item.variant_id else Product
            target_id = item.variant_id or item.product_id
            if target_id:
                db.execute(update(model).where(model.id == target_id).values(stock_quantity=model.stock_quantity + item.quantity), execution_options={"synchronize_session": False})
            item.inventory_deducted = False

    # If delivered and COD, update payment status to paid
    if new_status == "delivered" and order.payment_method == "cod":
        order.payment_status = "paid"
    if new_status == "refunded":
        order.payment_status = "refunded"

    order.status = new_status
    if req.admin_note:
        order.admin_note = req.admin_note
    order.updated_at = datetime.now(timezone.utc)
    db.add(AuditLog(actor_user_id=actor.id, shop_id=shop.id, action="order.status_change", resource_type="order", resource_id=order.id, details_json=json.dumps({"old_status": old_status, "new_status": new_status})))

    db.commit()
    db.refresh(order)
    return _format_order_response(order)

