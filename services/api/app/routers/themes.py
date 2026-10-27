import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.shop import Shop
from app.models.theme import Theme, ShopThemeSetting
from app.core.tenant import require_shop_access
from app.schemas.page import WebsiteType
from app.schemas.theme import ThemeResponse, ShopThemeSettingUpdate, ShopThemeSettingResponse, StorefrontContentUpdate

router = APIRouter(tags=["Themes"])

@router.get("/themes", response_model=List[ThemeResponse])
def list_themes(website_type: WebsiteType = 'online_store', db: Session = Depends(get_db)):
    themes = db.query(Theme).filter(Theme.is_active == True, Theme.website_type == website_type).all()
    return [ThemeResponse.model_validate(t) for t in themes]

@router.get("/themes/{theme_key}", response_model=ThemeResponse)
def get_theme(theme_key: str, db: Session = Depends(get_db)):
    theme = db.query(Theme).filter(Theme.theme_key == theme_key).first()
    if not theme:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Theme not found")
    return ThemeResponse.model_validate(theme)

@router.get("/shops/{shop_id}/theme-settings", response_model=ShopThemeSettingResponse)
def get_shop_theme_settings(
    shop: Shop = Depends(require_shop_access),
    db: Session = Depends(get_db)
):
    setting = db.query(ShopThemeSetting).filter(ShopThemeSetting.shop_id == shop.id).first()
    if not setting:
        raise HTTPException(404, "No theme configured. Select a theme for this shop.")

    try:
        parsed_settings = json.loads(setting.settings_json)
    except Exception:
        parsed_settings = {}

    return ShopThemeSettingResponse(
        shop_id=shop.id,
        theme_id=setting.theme_id,
        theme_key=setting.theme.theme_key,
        theme_name=setting.theme.name,
        theme_version=setting.theme_version,
        settings=parsed_settings,
        updated_at=setting.updated_at
    )

@router.put("/shops/{shop_id}/theme-settings", response_model=ShopThemeSettingResponse)
def update_shop_theme_settings(
    req: ShopThemeSettingUpdate,
    shop: Shop = Depends(require_shop_access),
    db: Session = Depends(get_db)
):
    setting = db.query(ShopThemeSetting).filter(ShopThemeSetting.shop_id == shop.id).first()
    
    # If switching theme
    if req.theme_key:
        theme = db.query(Theme).filter(Theme.theme_key == req.theme_key, Theme.is_active == True).first()
        if theme and theme.website_type != shop.website_type:
            raise HTTPException(400, 'Choose a theme for this website type')
        if not theme:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Theme '{req.theme_key}' not found")
        if not setting:
            setting = ShopThemeSetting(shop_id=shop.id, theme_id=theme.id, theme_version=theme.version, settings_json="{}")
            db.add(setting)
        setting.theme_id = theme.id
        setting.theme_version = theme.version

    if not setting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Theme settings not found")

    setting.settings_json = json.dumps(req.settings_json)
    db.commit()
    db.refresh(setting)

    return ShopThemeSettingResponse(
        shop_id=shop.id,
        theme_id=setting.theme_id,
        theme_key=setting.theme.theme_key,
        theme_name=setting.theme.name,
        theme_version=setting.theme_version,
        settings=req.settings_json,
        updated_at=setting.updated_at
    )


@router.put('/shops/{shop_id}/storefront-content')
def update_storefront_content(req: StorefrontContentUpdate, shop: Shop = Depends(require_shop_access), db: Session = Depends(get_db)):
    setting = db.query(ShopThemeSetting).filter(ShopThemeSetting.shop_id == shop.id).first()
    if not setting:
        raise HTTPException(404, 'Select a theme before customizing your storefront.')
    try:
        content = json.loads(setting.settings_json)
    except (ValueError, TypeError):
        content = {}
    if not isinstance(content, dict):
        content = {}
    previous_hero = content.get('hero', {})
    content['hero'] = {**(previous_hero if isinstance(previous_hero, dict) else {}), **req.hero.model_dump()}
    content['promotion'] = req.promotion.model_dump()
    shop.banner_url = req.banner_url
    setting.settings_json = json.dumps(content)
    db.commit()
    return {'banner_url': shop.banner_url, 'settings': content}

