from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from slugify import slugify
from app.database import get_db
from app.models.shop import Shop
from app.models.catalog import Category
from app.core.tenant import require_shop_access
from app.schemas.catalog import CategoryCreate, CategoryUpdate, CategoryResponse

router = APIRouter(prefix="/shops/{shop_id}/categories", tags=["Categories"])

def validate_parent(db, shop_id, parent_id, category_id=None):
    seen = {category_id} if category_id else set()
    while parent_id:
        if parent_id in seen:
            raise HTTPException(400, "Categories cannot form a cycle")
        seen.add(parent_id)
        parent = db.query(Category).filter(Category.id == parent_id, Category.shop_id == shop_id, Category.status == "active").first()
        if not parent:
            raise HTTPException(400, "Parent category is not available in this shop")
        parent_id = parent.parent_id

@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    req: CategoryCreate,
    shop: Shop = Depends(require_shop_access),
    db: Session = Depends(get_db)
):
    db.query(Shop).filter(Shop.id == shop.id).with_for_update().one()
    validate_parent(db, shop.id, req.parent_id)
    slug = req.slug or slugify(req.name)
    if not slug:
        raise HTTPException(400, "A valid category slug is required")
    existing = db.query(Category).filter(Category.shop_id == shop.id, Category.slug == slug).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A category with slug '{slug}' already exists in this shop"
        )
    
    category = Category(
        shop_id=shop.id,
        parent_id=req.parent_id,
        name=req.name.strip(),
        slug=slug,
        description=req.description,
        image_url=req.image_url,
        sort_order=req.sort_order,
        status="active"
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return CategoryResponse.model_validate(category)

@router.get("", response_model=List[CategoryResponse])
def list_categories(
    shop: Shop = Depends(require_shop_access),
    db: Session = Depends(get_db)
):
    categories = db.query(Category).filter(
        Category.shop_id == shop.id,
        Category.status == "active"
    ).order_by(Category.sort_order.asc(), Category.created_at.desc()).all()
    return [CategoryResponse.model_validate(c) for c in categories]

@router.patch("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: str,
    req: CategoryUpdate,
    shop: Shop = Depends(require_shop_access),
    db: Session = Depends(get_db)
):
    db.query(Shop).filter(Shop.id == shop.id).with_for_update().one()
    category = db.query(Category).filter(Category.id == category_id, Category.shop_id == shop.id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    
    update_data = req.model_dump(exclude_unset=True)
    if "parent_id" in update_data:
        validate_parent(db, shop.id, req.parent_id, category.id)
    if "slug" in update_data and update_data["slug"]:
        slug = slugify(update_data["slug"])
        if not slug:
            raise HTTPException(400, "A valid category slug is required")
        existing = db.query(Category).filter(
            Category.shop_id == shop.id,
            Category.slug == slug,
            Category.id != category_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Slug already in use by another category")
        update_data["slug"] = slug

    for field, val in update_data.items():
        setattr(category, field, val)

    db.commit()
    db.refresh(category)
    return CategoryResponse.model_validate(category)

@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: str,
    shop: Shop = Depends(require_shop_access),
    db: Session = Depends(get_db)
):
    category = db.query(Category).filter(Category.id == category_id, Category.shop_id == shop.id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    
    # Soft archive or delete
    category.status = "archived"
    db.commit()
    return None

