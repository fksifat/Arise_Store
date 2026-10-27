import json
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Shop, SitePage, ShopThemeSetting
from app.core.tenant import resolve_public_tenant

router = APIRouter(prefix='/public/website', tags=['Public websites'])


def published_query(db, shop, kind):
    return db.query(SitePage).filter(SitePage.shop_id == shop.id, SitePage.kind == kind, SitePage.published_json.isnot(None))


def summary(page):
    data = json.loads(page.published_json)
    return {key: data[key] for key in ('title','slug','description')} | {'published_at': page.published_at}


def public_site(db, shop):
    setting = db.query(ShopThemeSetting).filter(ShopThemeSetting.shop_id == shop.id).first()
    content = json.loads(setting.settings_json) if setting else {}
    pages = published_query(db, shop, 'page').order_by(SitePage.created_at, SitePage.id).all()
    posts = published_query(db, shop, 'post').order_by(SitePage.published_at.desc(), SitePage.id).limit(3).all()
    return {'id': shop.id, 'name': shop.name, 'slug': shop.slug, 'website_type': shop.website_type,
            'description': shop.description, 'logo_url': shop.logo_url, 'contact_email': shop.contact_email,
            'contact_phone': shop.contact_phone, 'address': shop.address,
            'theme_key': setting.theme.theme_key if setting else '', 'brand': content.get('brand', {}),
            'navigation': [summary(page) for page in pages if page.published_slug != 'home'],
            'recent_posts': [summary(post) for post in posts]}


@router.get('')
def get_website(shop: Shop = Depends(resolve_public_tenant), db: Session = Depends(get_db)):
    return public_site(db, shop)


@router.get('/content/{kind}/{slug}')
def get_content(kind: Literal['page','post'], slug: str, shop: Shop = Depends(resolve_public_tenant), db: Session = Depends(get_db)):
    page = published_query(db, shop, kind).filter(SitePage.published_slug == slug).first()
    if not page:
        raise HTTPException(404, 'This page is not published')
    content = json.loads(page.published_json)
    content['sections'] = [section for section in content['sections'] if section.get('enabled', True)]
    return {'site': public_site(db, shop), 'page': content | {'kind': page.kind, 'published_at': page.published_at}}


@router.get('/posts')
def get_posts(page: int = Query(1, ge=1, le=10000), shop: Shop = Depends(resolve_public_tenant), db: Session = Depends(get_db)):
    query = published_query(db, shop, 'post')
    rows = query.order_by(SitePage.published_at.desc(), SitePage.id).offset((page-1)*12).limit(12).all()
    return {'site': public_site(db, shop), 'items': [summary(row) for row in rows], 'total': query.count(), 'page': page, 'page_size': 12}
