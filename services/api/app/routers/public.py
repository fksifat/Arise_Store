import json
import hashlib
import secrets
import hmac
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header, status
from sqlalchemy.orm import Session
from sqlalchemy import update
from app.database import get_db
from app.models.shop import Shop
from app.models.theme import ShopThemeSetting
from app.models.catalog import Product, Category, ProductCategory, ProductVariant
from app.models.customer import Customer
from app.models.order import Order, OrderItem
from app.core.tenant import resolve_public_store
from app.routers.websites import public_site
from app.core.order_snapshots import option_snapshot
from app.core.promotions import shop_promotion, promotion_discount
from app.schemas.catalog import ProductResponse, CategoryResponse
from app.schemas.theme import ShopThemeSettingResponse
from app.schemas.order import OrderResponse
from app.schemas.public import PublicOrderResponse, TrackOrderRequest, normalize_phone
from app.schemas.public import (
    PublicStoreResponse,
    CartValidationRequest,
    CartValidationResponse,
    ValidatedCartItem,
    PublicCheckoutRequest
)
from app.routers.products import _format_product_response
from app.routers.orders import _format_order_response

router = APIRouter(prefix="/public", tags=["Public Storefront"])

def _generate_order_number() -> str:
    return f"ORD-{datetime.now(timezone.utc):%y%m%d}-{secrets.token_hex(12).upper()}"

@router.get("/store", response_model=PublicStoreResponse)
def get_public_store(
    shop: Shop = Depends(resolve_public_store),
    db: Session = Depends(get_db)
):
    # Load theme settings
    theme_setting = db.query(ShopThemeSetting).filter(ShopThemeSetting.shop_id == shop.id).first()
    if theme_setting:
        try:
            parsed = json.loads(theme_setting.settings_json)
        except Exception:
            parsed = {}
        theme_resp = ShopThemeSettingResponse(
            shop_id=shop.id,
            theme_id=theme_setting.theme_id,
            theme_key=theme_setting.theme.theme_key,
            theme_name=theme_setting.theme.name,
            theme_version=theme_setting.theme_version,
            settings=parsed,
            updated_at=theme_setting.updated_at
        )
    else:
        theme_resp = ShopThemeSettingResponse(
            shop_id=shop.id,
            theme_id="default",
            theme_key="fashion-modern",
            theme_name="Fashion Modern",
            theme_version="1.0.0",
            settings={},
            updated_at=datetime.now(timezone.utc)
        )

    # Categories
    categories = db.query(Category).filter(
        Category.shop_id == shop.id,
        Category.status == "active"
    ).order_by(Category.sort_order.asc()).all()

    # Featured Products
    featured = db.query(Product).filter(
        Product.shop_id == shop.id,
        Product.status == "active",
        Product.is_featured == True
    ).limit(8).all()
    if not featured:
        featured = db.query(Product).filter(
            Product.shop_id == shop.id,
            Product.status == "active"
        ).limit(8).all()

    promotion = shop_promotion(db, shop.id)
    return PublicStoreResponse(
        id=shop.id,
        name=shop.name,
        slug=shop.slug,
        description=shop.description,
        status=shop.status,
        default_currency=shop.default_currency,
        default_locale=shop.default_locale,
        logo_url=shop.logo_url,
        banner_url=shop.banner_url,
        discount_percent=promotion.discount_percent if promotion.enabled else 0,
        contact_email=shop.contact_email,
        contact_phone=shop.contact_phone,
        address=shop.address,
        inside_dhaka_delivery_fee_minor=shop.inside_dhaka_delivery_fee_minor,
        outside_dhaka_delivery_fee_minor=shop.outside_dhaka_delivery_fee_minor,
        theme=theme_resp,
        categories=[CategoryResponse.model_validate(c) for c in categories],
        featured_products=[_format_product_response(p) for p in featured],
        site_pages=public_site(db, shop)['navigation'] + ([{'title':'Blog','slug':'blog'}] if public_site(db, shop)['recent_posts'] else [])
    )

@router.get("/products", response_model=List[ProductResponse])
def get_public_products(
    category_slug: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = "newest",  # newest, price_asc, price_desc
    shop: Shop = Depends(resolve_public_store),
    db: Session = Depends(get_db)
):
    query = db.query(Product).filter(Product.shop_id == shop.id, Product.status == "active")

    if category_slug:
        cat = db.query(Category).filter(Category.shop_id == shop.id, Category.slug == category_slug, Category.status == "active").first()
        if not cat:
            return []
        query = query.join(ProductCategory).filter(ProductCategory.category_id == cat.id)

    if search:
        query = query.filter(Product.name.ilike(f"%{search}%") | Product.sku.ilike(f"%{search}%"))

    if sort_by == "price_asc":
        query = query.order_by(Product.price_minor.asc())
    elif sort_by == "price_desc":
        query = query.order_by(Product.price_minor.desc())
    else:
        query = query.order_by(Product.created_at.desc())

    products = query.all()
    return [_format_product_response(p) for p in products]

@router.get("/products/{slug}", response_model=ProductResponse)
def get_public_product_detail(
    slug: str,
    shop: Shop = Depends(resolve_public_store),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(
        Product.shop_id == shop.id,
        Product.slug == slug,
        Product.status == "active"
    ).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return _format_product_response(product)

def cart_lines(req, shop, db, reserve=False):
    quantities = {}
    for item in req.items:
        key = (item.product_id, item.variant_id)
        quantities[key] = quantities.get(key, 0) + item.quantity
        if quantities[key] > 100:
            raise HTTPException(400, "Maximum quantity per product option is 100")
    lines = []
    for (product_id, variant_id), quantity in sorted(quantities.items(), key=lambda row: (row[0][0], row[0][1] or "")):
        query = db.query(Product).filter(Product.id == product_id, Product.shop_id == shop.id, Product.status == "active")
        prod = query.populate_existing().with_for_update().first() if reserve else query.first()
        if not prod:
            raise HTTPException(400, "A product is no longer available")
        variant = None
        if variant_id:
            variant = db.query(ProductVariant).filter(ProductVariant.id == variant_id, ProductVariant.product_id == prod.id, ProductVariant.is_active == True).populate_existing().first()
            if not variant:
                raise HTTPException(400, "Selected product option is invalid")
        elif any(v.is_active for v in prod.variants):
            raise HTTPException(400, "Select a product option before checkout")
        unit_price = variant.price_minor if variant and variant.price_minor is not None else prod.price_minor
        stock = variant.stock_quantity if variant else prod.stock_quantity
        in_stock = not prod.track_inventory or stock >= quantity
        if unit_price < 0 or prod.currency != shop.default_currency:
            raise HTTPException(400, "Invalid product pricing. Contact the store.")
        if reserve and prod.track_inventory:
            model = ProductVariant if variant else Product
            target = variant or prod
            changed = db.execute(update(model).where(model.id == target.id, model.stock_quantity >= quantity).values(stock_quantity=model.stock_quantity - quantity), execution_options={"synchronize_session": False}).rowcount
            if changed != 1:
                raise HTTPException(409, {"code": "out_of_stock", "message": f"Insufficient stock for '{prod.name}'"})
        image = next((i.image_url for i in prod.images if i.is_primary), prod.images[0].image_url if prod.images else None)
        lines.append((prod, variant, ValidatedCartItem(
            product_id=prod.id, variant_id=variant_id,
            name=prod.name + (f" ({variant.title})" if variant else ""),
            image_url=image, unit_price_minor=unit_price, quantity=quantity,
            line_total_minor=unit_price * quantity, in_stock=in_stock, available_stock=stock
        )))
    return lines


def cart_totals(req, shop, lines, db):
    subtotal = sum(line.line_total_minor for _, _, line in lines)
    fee = int(shop.inside_dhaka_delivery_fee_minor if req.shipping_city == "Dhaka" else shop.outside_dhaka_delivery_fee_minor)
    discount = promotion_discount(subtotal, shop_promotion(db, shop.id))
    return subtotal, fee, discount, subtotal - discount + fee


@router.post("/cart/validate", response_model=CartValidationResponse)
def validate_cart(req: CartValidationRequest, shop: Shop = Depends(resolve_public_store), db: Session = Depends(get_db)):
    lines = cart_lines(req, shop, db)
    subtotal, fee, discount, total = cart_totals(req, shop, lines, db)
    return CartValidationResponse(items=[line for _, _, line in lines], subtotal_minor=subtotal, delivery_fee_minor=fee, discount_minor=discount, total_minor=total, currency=shop.default_currency, all_in_stock=all(line.in_stock for _, _, line in lines))


@router.post("/orders", response_model=PublicOrderResponse, status_code=201)
def place_order(
    req: PublicCheckoutRequest,
    idempotency_key: str = Header(..., alias="Idempotency-Key", min_length=16, max_length=100, pattern=r"^[A-Za-z0-9_-]+$"),
    shop: Shop = Depends(resolve_public_store), db: Session = Depends(get_db)
):
    # Serialize checkout retries and customer creation per shop; stock updates remain conditional.
    db.query(Shop).filter(Shop.id == shop.id).populate_existing().with_for_update().one()
    if shop.status != "published":
        raise HTTPException(403, "This store is not open")
    digest = hashlib.sha256(req.model_dump_json().encode()).hexdigest()
    previous = db.query(Order).filter(Order.shop_id == shop.id, Order.idempotency_key == idempotency_key).first()
    if previous:
        if previous.request_hash != digest:
            raise HTTPException(409, "This checkout key was already used for a different request")
        return _format_order_response(previous)
    lines = cart_lines(req, shop, db, reserve=True)
    subtotal, fee, discount, total = cart_totals(req, shop, lines, db)
    if req.expected_total_minor is not None and req.expected_total_minor != total:
        raise HTTPException(409, {"code": "price_changed", "message": "Prices changed. Refresh your cart and confirm the new total."})
    customer = db.query(Customer).filter(Customer.shop_id == shop.id, Customer.phone == req.customer_phone).first()
    if not customer:
        customer = Customer(shop_id=shop.id, name=req.customer_name.strip(), phone=req.customer_phone, email=req.customer_email, default_address=req.shipping_address.strip())
        db.add(customer)
        db.flush()
    order = Order(shop_id=shop.id, customer_id=customer.id, order_number=_generate_order_number(),
        idempotency_key=idempotency_key, request_hash=digest, status="pending", payment_method="cod", payment_status="unpaid",
        subtotal_minor=subtotal, delivery_fee_minor=fee, discount_minor=discount, total_minor=total, currency=shop.default_currency,
        customer_name=req.customer_name.strip(), customer_phone=req.customer_phone, customer_email=req.customer_email,
        shipping_city=req.shipping_city, shipping_address=req.shipping_address.strip(), customer_note=req.customer_note)
    db.add(order)
    db.flush()
    for prod, variant, line in lines:
        db.add(OrderItem(order_id=order.id, product_id=prod.id, variant_id=variant.id if variant else None,
            product_name_snapshot=prod.name, sku_snapshot=variant.sku if variant and variant.sku else prod.sku,
            variant_snapshot_json=option_snapshot(variant) if variant else None, product_image_url_snapshot=line.image_url,
            unit_price_minor=line.unit_price_minor, quantity=line.quantity, line_total_minor=line.line_total_minor,
            inventory_deducted=prod.track_inventory))
    db.commit()
    db.refresh(order)
    return _format_order_response(order)


def find_order(order_number, phone, shop, db):
    try:
        phone = normalize_phone(phone)
    except ValueError:
        raise HTTPException(404, "Order not found or verification phone does not match")
    order = db.query(Order).filter(Order.shop_id == shop.id, Order.order_number == order_number).first()
    if not order or not hmac.compare_digest(order.customer_phone, phone):
        raise HTTPException(404, "Order not found or verification phone does not match")
    return _format_order_response(order)


@router.post("/orders/track", response_model=PublicOrderResponse)
def track_order(req: TrackOrderRequest, shop: Shop = Depends(resolve_public_store), db: Session = Depends(get_db)):
    return find_order(req.order_number, req.phone, shop, db)


@router.get("/orders/track/{order_number}", response_model=PublicOrderResponse, deprecated=True)
def track_order_legacy(order_number: str, phone: str = Query(..., min_length=11, max_length=20), shop: Shop = Depends(resolve_public_store), db: Session = Depends(get_db)):
    return find_order(order_number, phone, shop, db)
