from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from slugify import slugify
from app.database import get_db
from app.models.shop import Shop
from app.models.catalog import Product, Category, ProductCategory, ProductImage, ProductVariant
from app.models.subscription import Subscription, Plan
from app.core.tenant import require_shop_access
from app.core.subscriptions import active_subscription
from app.schemas.catalog import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    ProductImageResponse,
    ProductVariantResponse,
    ProductVariantCreate,
    ProductVariantUpdate
)

router = APIRouter(prefix="/shops/{shop_id}/products", tags=["Products"])

def _replace_images(product: Product, images):
    primary = next((i for i, image in enumerate(images) if image.is_primary), 0)
    product.images = [ProductImage(
        image_url=image.image_url, alt_text=image.alt_text,
        sort_order=image.sort_order or i, is_primary=i == primary,
    ) for i, image in enumerate(images)]

def _format_product_response(p: Product) -> ProductResponse:
    images = [
        ProductImageResponse(
            id=img.id,
            product_id=img.product_id,
            image_url=img.image_url,
            alt_text=img.alt_text,
            sort_order=img.sort_order,
            is_primary=img.is_primary
        ) for img in p.images
    ]
    variants = [
        ProductVariantResponse(
            id=v.id,
            product_id=v.product_id,
            title=v.title,
            sku=v.sku,
            attributes_json=v.attributes_json,
            price_minor=v.price_minor,
            stock_quantity=v.stock_quantity,
            is_active=v.is_active
        ) for v in p.variants
    ]
    cat_ids = [ca.category_id for ca in p.category_associations]
    
    return ProductResponse(
        id=p.id,
        shop_id=p.shop_id,
        name=p.name,
        slug=p.slug,
        description=p.description,
        status=p.status,
        price_minor=p.price_minor,
        compare_at_price_minor=p.compare_at_price_minor,
        currency=p.currency,
        sku=p.sku,
        stock_quantity=p.stock_quantity,
        track_inventory=p.track_inventory,
        is_featured=p.is_featured,
        published_at=p.published_at,
        created_at=p.created_at,
        images=images,
        variants=variants,
        category_ids=cat_ids
    )

@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    req: ProductCreate,
    shop: Shop = Depends(require_shop_access),
    db: Session = Depends(get_db)
):
    # Check plan product limit
    db.query(Shop).filter(Shop.id == shop.id).with_for_update().one()
    sub = active_subscription(db, shop.id)
    if sub and sub.plan:
        current_count = db.query(Product).filter(Product.shop_id == shop.id, Product.status != "archived").count()
        if current_count >= sub.plan.product_limit:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Product limit reached ({sub.plan.product_limit}) for your current plan '{sub.plan.name}'. Please upgrade to add more products."
            )

    slug = req.slug or slugify(req.name)
    if not slug:
        raise HTTPException(400, "A valid product slug is required")
    if req.currency != shop.default_currency:
        raise HTTPException(400, "Product currency must match the shop currency")
    for cid in set(req.category_ids):
        if not db.query(Category).filter(Category.id == cid, Category.shop_id == shop.id, Category.status == "active").first():
            raise HTTPException(400, "Category is not available in this shop")
    existing = db.query(Product).filter(Product.shop_id == shop.id, Product.slug == slug).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A product with slug '{slug}' already exists in this shop"
        )

    product = Product(
        shop_id=shop.id,
        name=req.name.strip(),
        slug=slug,
        description=req.description,
        status=req.status,
        price_minor=req.price_minor,
        compare_at_price_minor=req.compare_at_price_minor,
        currency=req.currency,
        sku=req.sku,
        stock_quantity=req.stock_quantity,
        track_inventory=req.track_inventory,
        is_featured=req.is_featured,
        published_at=datetime.now(timezone.utc) if req.status == "active" else None
    )
    db.add(product)
    db.flush()

    _replace_images(product, req.images)

    # Variants
    for v in req.variants:
        p_var = ProductVariant(
            product_id=product.id,
            title=v.title,
            sku=v.sku,
            attributes_json=v.attributes_json,
            price_minor=v.price_minor,
            stock_quantity=v.stock_quantity,
            is_active=v.is_active
        )
        db.add(p_var)

    # Categories
    if req.category_ids:
        for cid in set(req.category_ids):
            cat = db.query(Category).filter(Category.id == cid, Category.shop_id == shop.id).first()
            if cat:
                db.add(ProductCategory(product_id=product.id, category_id=cat.id))

    db.commit()
    db.refresh(product)
    return _format_product_response(product)

@router.get("", response_model=List[ProductResponse])
def list_products(
    category_id: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    shop: Shop = Depends(require_shop_access),
    db: Session = Depends(get_db)
):
    query = db.query(Product).filter(Product.shop_id == shop.id)
    if status_filter:
        query = query.filter(Product.status == status_filter)
    else:
        query = query.filter(Product.status != "archived")

    if search:
        query = query.filter(Product.name.ilike(f"%{search}%") | Product.sku.ilike(f"%{search}%"))

    if category_id:
        query = query.join(ProductCategory).filter(ProductCategory.category_id == category_id)

    products = query.order_by(Product.created_at.desc()).all()
    return [_format_product_response(p) for p in products]

@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: str,
    shop: Shop = Depends(require_shop_access),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id, Product.shop_id == shop.id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return _format_product_response(product)

@router.patch("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: str,
    req: ProductUpdate,
    shop: Shop = Depends(require_shop_access),
    db: Session = Depends(get_db)
):
    db.query(Shop).filter(Shop.id == shop.id).with_for_update().one()
    product = db.query(Product).filter(Product.id == product_id, Product.shop_id == shop.id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    update_data = req.model_dump(exclude_unset=True)
    expected_stock = update_data.pop("expected_stock_quantity", None)
    if "stock_quantity" in update_data and expected_stock is not None and product.stock_quantity != expected_stock:
        raise HTTPException(409, "Stock changed while you were editing. Reload the product before adjusting inventory.")
    if "images" in update_data:
        update_data.pop("images")
        _replace_images(product, req.images)
    if product.status == "archived" and update_data.get("status", "archived") != "archived":
        sub = active_subscription(db, shop.id)
        count = db.query(Product).filter(Product.shop_id == shop.id, Product.status != "archived").count()
        if count >= sub.plan.product_limit:
            raise HTTPException(403, "Product limit reached")
    if "slug" in update_data and update_data["slug"]:
        slug = slugify(update_data["slug"])
        if not slug:
            raise HTTPException(400, "A valid product slug is required")
        existing = db.query(Product).filter(
            Product.shop_id == shop.id,
            Product.slug == slug,
            Product.id != product_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Slug already in use by another product in this shop")
        update_data["slug"] = slug

    if "category_ids" in update_data:
        cat_ids = update_data.pop("category_ids")
        db.query(ProductCategory).filter(ProductCategory.product_id == product.id).delete()
        if cat_ids:
            for cid in set(cat_ids):
                cat = db.query(Category).filter(Category.id == cid, Category.shop_id == shop.id).first()
                if not cat or cat.status != "active":
                    raise HTTPException(400, "Category is not available in this shop")
                db.add(ProductCategory(product_id=product.id, category_id=cat.id))

    for field, val in update_data.items():
        setattr(product, field, val)

    db.commit()
    db.refresh(product)
    return _format_product_response(product)

@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: str,
    shop: Shop = Depends(require_shop_access),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id, Product.shop_id == shop.id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    
    product.status = "archived"
    db.commit()
    return None



@router.post('/{product_id}/variants', response_model=ProductVariantResponse, status_code=201)
def create_variant(product_id: str, req: ProductVariantCreate, shop: Shop = Depends(require_shop_access), db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id, Product.shop_id == shop.id).with_for_update().first()
    if not product or product.status == 'archived':
        raise HTTPException(404, 'Product not found')
    if db.query(ProductVariant).filter(ProductVariant.product_id == product.id).count() >= 100:
        raise HTTPException(400, 'A product can have up to 100 options')
    variant = ProductVariant(product_id=product.id, **req.model_dump())
    db.add(variant); db.commit(); db.refresh(variant)
    return ProductVariantResponse.model_validate(variant)


@router.patch('/{product_id}/variants/{variant_id}', response_model=ProductVariantResponse)
def update_variant(product_id: str, variant_id: str, req: ProductVariantUpdate, shop: Shop = Depends(require_shop_access), db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id, Product.shop_id == shop.id).with_for_update().first()
    if not product or product.status == 'archived':
        raise HTTPException(404, 'Product not found')
    variant = db.query(ProductVariant).filter(ProductVariant.id == variant_id, ProductVariant.product_id == product.id).populate_existing().with_for_update().first()
    if not variant:
        raise HTTPException(404, 'Product option not found')
    changes = req.model_dump(exclude_unset=True)
    expected = changes.pop('expected_stock_quantity', None)
    if 'stock_quantity' in changes and variant.stock_quantity != expected:
        raise HTTPException(409, 'Option stock changed while you were editing. Reload the options before adjusting inventory.')
    for field, value in changes.items():
        setattr(variant, field, value)
    db.commit(); db.refresh(variant)
    return ProductVariantResponse.model_validate(variant)
