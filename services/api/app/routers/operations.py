from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func, or_
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.tenant import require_shop_access
from app.core.constants import ORDER_STATUSES
from app.models import Shop, Customer, Order, OrderItem
from app.routers.orders import _format_order_response
from app.schemas.operations import CustomerSummary, CustomerPage, CustomerHistory, SalesReport

router = APIRouter(prefix='/shops/{shop_id}', tags=['Merchant operations'])
DHAKA = ZoneInfo('Asia/Dhaka')


def customer_query(db, shop_id):
    counts = db.query(
        Order.customer_id,
        func.count(Order.id).label('total_orders'),
        func.sum(case((Order.status == 'delivered', 1), else_=0)).label('delivered_orders'),
        func.sum(case((Order.status == 'cancelled', 1), else_=0)).label('cancelled_orders'),
        func.sum(case((Order.status.in_(['returned', 'refunded']), 1), else_=0)).label('returned_orders'),
        func.sum(case((Order.status == 'delivered', Order.total_minor), else_=0)).label('delivered_value_minor'),
        func.max(Order.created_at).label('last_order_at'),
    ).filter(Order.shop_id == shop_id).group_by(Order.customer_id).subquery()
    return db.query(Customer, counts.c.total_orders, counts.c.delivered_orders, counts.c.cancelled_orders,
                    counts.c.returned_orders, counts.c.delivered_value_minor, counts.c.last_order_at
                    ).outerjoin(counts, counts.c.customer_id == Customer.id).filter(Customer.shop_id == shop_id)


def customer_summary(row):
    customer = row[0]
    return CustomerSummary(id=customer.id, name=customer.name, phone=customer.phone, email=customer.email,
        total_orders=int(row[1] or 0), delivered_orders=int(row[2] or 0), cancelled_orders=int(row[3] or 0),
        returned_orders=int(row[4] or 0), delivered_value_minor=int(row[5] or 0), last_order_at=row[6])


@router.get('/customers', response_model=CustomerPage)
def list_customers(search: str = Query('', max_length=100), page: int = Query(1, ge=1, le=100000),
                   page_size: int = Query(25, ge=1, le=100), shop: Shop = Depends(require_shop_access), db: Session = Depends(get_db)):
    query = customer_query(db, shop.id)
    if search.strip():
        term = f'%{search.strip()}%'
        query = query.filter(or_(Customer.name.ilike(term), Customer.phone.ilike(term), Customer.email.ilike(term)))
    total = query.count()
    rows = query.order_by(Customer.created_at.desc(), Customer.id).offset((page - 1) * page_size).limit(page_size).all()
    return CustomerPage(items=[customer_summary(row) for row in rows], total=total, page=page, page_size=page_size)


@router.get('/customers/{customer_id}', response_model=CustomerHistory)
def customer_history(customer_id: str, shop: Shop = Depends(require_shop_access), db: Session = Depends(get_db)):
    row = customer_query(db, shop.id).filter(Customer.id == customer_id).first()
    if not row:
        raise HTTPException(404, 'Customer not found')
    summary = customer_summary(row)
    orders = db.query(Order).filter(Order.shop_id == shop.id, Order.customer_id == customer_id).order_by(Order.created_at.desc(), Order.id).limit(50).all()
    return CustomerHistory(**summary.model_dump(), orders=[_format_order_response(order) for order in orders], has_more_orders=summary.total_orders > 50)


def report_period(start_date, end_date):
    try:
        end = end_date or datetime.now(DHAKA).date()
        start = start_date or end - timedelta(days=29)
        if start > end or (end - start).days > 365:
            raise HTTPException(422, 'Choose a date range of 1 to 366 days.')
        # Database timestamps are stored as UTC without a timezone, on both supported databases.
        lower = datetime.combine(start, time.min, DHAKA).astimezone(timezone.utc).replace(tzinfo=None)
        upper = datetime.combine(end + timedelta(days=1), time.min, DHAKA).astimezone(timezone.utc).replace(tzinfo=None)
    except (ValueError, OverflowError):
        raise HTTPException(422, 'Choose valid business dates.')
    return start, end, lower, upper


@router.get('/reports', response_model=SalesReport)
def sales_report(start_date: date | None = None, end_date: date | None = None,
                 shop: Shop = Depends(require_shop_access), db: Session = Depends(get_db)):
    start, end, lower, upper = report_period(start_date, end_date)
    conditions = [Order.shop_id == shop.id, Order.created_at >= lower, Order.created_at < upper]
    rows = db.query(Order.created_at, Order.status, Order.subtotal_minor, Order.discount_minor,
                    Order.delivery_fee_minor, Order.total_minor).filter(*conditions).yield_per(500)
    statuses = {status: 0 for status in ORDER_STATUSES}
    daily = {start + timedelta(days=offset): {'date': start + timedelta(days=offset), 'orders': 0, 'delivered_value_minor': 0}
             for offset in range((end - start).days + 1)}
    metrics = {'total_orders': 0, 'awaiting_fulfillment': 0, 'delivered_orders': 0, 'delivered_value_minor': 0,
               'delivered_products_minor': 0, 'delivered_delivery_minor': 0, 'delivered_discounts_minor': 0}
    for row in rows:
        stamp = row.created_at.replace(tzinfo=timezone.utc) if row.created_at.tzinfo is None else row.created_at
        day = daily[stamp.astimezone(DHAKA).date()]
        day['orders'] += 1
        metrics['total_orders'] += 1
        statuses[row.status] = statuses.get(row.status, 0) + 1
        if row.status in ('pending', 'confirmed', 'processing', 'ready_to_ship'):
            metrics['awaiting_fulfillment'] += 1
        if row.status == 'delivered':
            metrics['delivered_orders'] += 1
            metrics['delivered_value_minor'] += row.total_minor
            metrics['delivered_products_minor'] += row.subtotal_minor - row.discount_minor
            metrics['delivered_delivery_minor'] += row.delivery_fee_minor
            metrics['delivered_discounts_minor'] += row.discount_minor
            day['delivered_value_minor'] += row.total_minor
    count = metrics['delivered_orders']
    metrics['average_delivered_minor'] = (metrics['delivered_value_minor'] + count // 2) // count if count else 0
    metrics['customer_count'] = db.query(func.count(func.distinct(Order.customer_phone))).filter(*conditions).scalar()
    top = db.query(OrderItem.product_name_snapshot, func.sum(OrderItem.quantity), func.sum(OrderItem.line_total_minor)
        ).join(Order, Order.id == OrderItem.order_id).filter(*conditions, Order.status == 'delivered'
        ).group_by(OrderItem.product_id, OrderItem.product_name_snapshot
        ).order_by(func.sum(OrderItem.quantity).desc(), OrderItem.product_name_snapshot).limit(10).all()
    return SalesReport(start_date=start, end_date=end, metrics=metrics, statuses=statuses, daily=list(daily.values()),
        top_products=[{'name': row[0], 'units': int(row[1]), 'item_value_minor': int(row[2])} for row in top])
