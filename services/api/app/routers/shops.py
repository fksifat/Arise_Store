from typing import List
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.setup import SetupDraft
from app.models.shop import Shop, ShopMembership, ShopDomain
from app.models.theme import Theme, ShopThemeSetting
from app.models.subscription import Plan, Subscription
from app.core.tenant import get_current_user, require_shop_access
from app.schemas.shop import ShopCreate, ShopUpdate, ShopResponse
from app.config import settings
from app.core.subscriptions import active_subscription
from app.core.websites import default_theme, starter_sections
from app.models.page import SitePage
from app.schemas.page import PageSection
import json

router = APIRouter(prefix="/shops", tags=["Shops"])

@router.post("", response_model=ShopResponse, status_code=status.HTTP_201_CREATED)
def create_shop(req: ShopCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    theme_key = req.theme_key or default_theme(req.website_type)
    theme = db.query(Theme).filter(Theme.theme_key == theme_key, Theme.is_active == True, Theme.website_type == req.website_type).first()
    if not theme:
        raise HTTPException(400, 'Choose an available theme for this website type')
    # 1. Enforce unique slug across platform
    existing = db.query(Shop).filter(Shop.slug == req.slug).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"The shop slug '{req.slug}' is already taken. Please choose another name."
        )

    # 2. Create the shop
    shop = Shop(
        owner_user_id=current_user.id,
        name=req.name.strip(),
        slug=req.slug,
        website_type=req.website_type,
        description=req.description,
        default_currency=req.default_currency,
        default_locale=req.default_locale,
        contact_email=req.contact_email or (current_user.email if req.website_type == 'online_store' else None),
        contact_phone=req.contact_phone or current_user.phone,
        address=req.address,
        inside_dhaka_delivery_fee_minor=req.inside_dhaka_delivery_fee_minor,
        outside_dhaka_delivery_fee_minor=req.outside_dhaka_delivery_fee_minor,
        status="draft"
    )
    db.add(shop)
    db.flush()  # gets shop.id

    # 3. Add owner membership
    membership = ShopMembership(
        shop_id=shop.id,
        user_id=current_user.id,
        role="owner",
        status="active"
    )
    db.add(membership)

    # 4. Bind platform subdomain
    subdomain = ShopDomain(
        shop_id=shop.id,
        hostname=f"{shop.slug}.{settings.PLATFORM_BASE_DOMAIN}",
        domain_type="platform_subdomain",
        verification_status="verified",
        routing_status="active",
        verified_at=datetime.now(timezone.utc)
    )
    db.add(subdomain)

    # 5. Attach selected or default theme
    if theme:
        theme_setting = ShopThemeSetting(
            shop_id=shop.id,
            theme_id=theme.id,
            theme_version=theme.version,
            settings_json=theme.configuration_schema
        )
        db.add(theme_setting)

    if req.website_type != 'online_store':
        sections = [PageSection.model_validate(item).model_dump() for item in starter_sections(req.website_type)]
        db.add(SitePage(shop_id=shop.id, kind='page', title='Home', slug='home', description=req.description or '', sections_json=json.dumps(sections)))

    # 6. Assign free trial subscription
    starter_plan = db.query(Plan).filter(Plan.slug == "starter").first()
    if starter_plan:
        sub = Subscription(
            shop_id=shop.id,
            plan_id=starter_plan.id,
            status="trial",
            billing_interval="monthly",
            starts_at=datetime.now(timezone.utc),
            current_period_start=datetime.now(timezone.utc),
            current_period_end=datetime.now(timezone.utc) + timedelta(days=14),
            trial_ends_at=datetime.now(timezone.utc) + timedelta(days=14)
        )
        db.add(sub)
    else:
        raise HTTPException(503, "Plans are not configured. Run the reference-data setup command.")

    if req.complete_setup:
        db.query(SetupDraft).filter(SetupDraft.user_id == current_user.id).delete()
    db.commit()
    db.refresh(shop)
    return ShopResponse.model_validate(shop)

@router.get("", response_model=List[ShopResponse])
def list_my_shops(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "platform_admin":
        shops = db.query(Shop).order_by(Shop.created_at.desc()).all()
    else:
        # User is owner or member
        shops = db.query(Shop).join(ShopMembership).filter(
            ShopMembership.user_id == current_user.id,
            ShopMembership.status == "active"
        ).order_by(Shop.created_at.desc()).all()
    return [ShopResponse.model_validate(s) for s in shops]

@router.get("/{shop_id}", response_model=ShopResponse)
def get_shop(shop: Shop = Depends(require_shop_access)):
    return ShopResponse.model_validate(shop)

@router.patch("/{shop_id}", response_model=ShopResponse)
def update_shop(
    req: ShopUpdate,
    shop: Shop = Depends(require_shop_access),
    db: Session = Depends(get_db)
):
    update_data = req.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(shop, field, val)
    db.commit()
    db.refresh(shop)
    return ShopResponse.model_validate(shop)

@router.post("/{shop_id}/publish", response_model=ShopResponse)
def publish_shop(
    shop: Shop = Depends(require_shop_access),
    db: Session = Depends(get_db)
):
    if shop.status not in ("draft", "published"):
        raise HTTPException(403, "Only platform administrators can restore a restricted shop")
    active_subscription(db, shop.id)
    if shop.website_type != 'online_store' and not db.query(SitePage.id).filter(SitePage.shop_id == shop.id, SitePage.kind == 'page', SitePage.published_slug == 'home', SitePage.published_json.isnot(None)).first():
        raise HTTPException(409, 'Publish your homepage in Pages before publishing the website')
    shop.status = "published"
    shop.published_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(shop)
    return ShopResponse.model_validate(shop)

@router.post("/{shop_id}/unpublish", response_model=ShopResponse)
def unpublish_shop(
    shop: Shop = Depends(require_shop_access),
    db: Session = Depends(get_db)
):
    if shop.status not in ("draft", "published"):
        raise HTTPException(403, "Only platform administrators can restore a restricted shop")
    shop.status = "draft"
    db.commit()
    db.refresh(shop)
    return ShopResponse.model_validate(shop)

