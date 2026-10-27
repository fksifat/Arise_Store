import json
from datetime import datetime, timezone
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Shop, SitePage, AuditLog, User
from app.core.tenant import require_shop_access, get_current_user
from app.core.subscriptions import active_subscription
from app.schemas.page import PageCreate, PageSave, PageRevision, PageResponse, PageSummary

router = APIRouter(prefix='/shops/{shop_id}/pages', tags=['Website content'])


def document(page):
    return {'title': page.title, 'slug': page.slug, 'description': page.description, 'sections': json.loads(page.sections_json)}


def format_page(page, detail=False):
    current = document(page)
    result = {field: getattr(page, field) for field in ('id','kind','title','slug','description','revision','published_slug','published_at','updated_at')}
    result['has_unpublished_changes'] = not page.published_json or current != json.loads(page.published_json)
    if detail:
        result['sections'] = current['sections']
    return result


def find_page(db, shop, page_id, expected=None):
    page = db.query(SitePage).filter(SitePage.shop_id == shop.id, SitePage.id == page_id).populate_existing().with_for_update().first()
    if not page:
        raise HTTPException(404, 'Page not found')
    if expected is not None and page.revision != expected:
        raise HTTPException(409, 'This content changed in another editor. Reload it before saving or publishing.')
    return page


def ensure_available_slug(db, shop, kind, slug, page_id=None):
    query = db.query(SitePage.id).filter(SitePage.shop_id == shop.id, SitePage.kind == kind, SitePage.slug == slug)
    if page_id:
        query = query.filter(SitePage.id != page_id)
    if query.first():
        raise HTTPException(409, f'That URL is already used by another {kind}. Choose a different URL.')


def audit(db, shop, page, action, actor):
    db.add(AuditLog(actor_user_id=actor.id, shop_id=shop.id, action=f'website.{action}', resource_type=page.kind, resource_id=page.id,
                    details_json=json.dumps({'slug': page.slug, 'revision': page.revision})))


@router.get('')
def list_pages(kind: Literal['page','post'] | None = None, search: str = Query('', max_length=100),
               page: int = Query(1, ge=1, le=10000), page_size: int = Query(25, ge=1, le=50),
               shop: Shop = Depends(require_shop_access), db: Session = Depends(get_db)):
    query = db.query(SitePage).filter(SitePage.shop_id == shop.id)
    if kind:
        query = query.filter(SitePage.kind == kind)
    if search.strip():
        query = query.filter(SitePage.title.ilike(f'%{search.strip()}%'))
    total = query.count()
    published = query.filter(SitePage.published_json.isnot(None)).count()
    rows = query.order_by(SitePage.updated_at.desc(), SitePage.id).offset((page-1)*page_size).limit(page_size).all()
    return {'items': [format_page(row) for row in rows], 'total': total, 'published_total': published, 'page': page, 'page_size': page_size}


@router.post('', response_model=PageResponse, status_code=201)
def create_page(req: PageCreate, shop: Shop = Depends(require_shop_access), db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    active_subscription(db, shop.id)
    # shortcut: bounded content per tenant; add plan-specific limits when larger publishing workloads are needed.
    if db.query(SitePage).filter(SitePage.shop_id == shop.id).count() >= 500:
        raise HTTPException(403, 'This website has reached its 500-page and post limit')
    if req.slug == 'home' and (req.kind == 'post' or shop.website_type == 'online_store'):
        raise HTTPException(400, 'The home URL is reserved for the website homepage')
    ensure_available_slug(db, shop, req.kind, req.slug)
    values = req.model_dump(exclude={'sections'})
    page = SitePage(shop_id=shop.id, **values, sections_json=json.dumps([section.model_dump() for section in req.sections]))
    db.add(page); db.flush(); audit(db, shop, page, 'content_created', actor); db.commit(); db.refresh(page)
    return format_page(page, detail=True)


@router.get('/preview-site')
def preview_site(shop: Shop = Depends(require_shop_access), db: Session = Depends(get_db)):
    from app.routers.websites import public_site
    return public_site(db, shop)


@router.get('/{page_id}', response_model=PageResponse)
def get_page(page_id: str, shop: Shop = Depends(require_shop_access), db: Session = Depends(get_db)):
    page = db.query(SitePage).filter(SitePage.id == page_id, SitePage.shop_id == shop.id).first()
    if not page:
        raise HTTPException(404, 'Page not found')
    return format_page(page, detail=True)


@router.put('/{page_id}', response_model=PageResponse)
def save_page(page_id: str, req: PageSave, shop: Shop = Depends(require_shop_access), db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    page = find_page(db, shop, page_id, req.expected_revision)
    if (page.slug == 'home' or req.slug == 'home') and page.slug != req.slug:
        raise HTTPException(400, 'The homepage URL cannot be changed')
    ensure_available_slug(db, shop, page.kind, req.slug, page.id)
    page.title, page.slug, page.description = req.title, req.slug, req.description
    page.sections_json = json.dumps([section.model_dump() for section in req.sections])
    page.revision += 1
    audit(db, shop, page, 'draft_saved', actor); db.commit(); db.refresh(page)
    return format_page(page, detail=True)


@router.post('/{page_id}/publish', response_model=PageResponse)
def publish_page(page_id: str, req: PageRevision, shop: Shop = Depends(require_shop_access), db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    active_subscription(db, shop.id)
    page = find_page(db, shop, page_id, req.expected_revision)
    if not any(section.get('enabled', True) for section in json.loads(page.sections_json)):
        raise HTTPException(400, 'Add at least one visible section before publishing')
    collision = db.query(SitePage.id).filter(SitePage.shop_id == shop.id, SitePage.kind == page.kind,
                 SitePage.published_slug == page.slug, SitePage.id != page.id).first()
    if collision:
        raise HTTPException(409, 'That URL is already published by another page. Choose a different URL or unpublish the other page first.')
    page.published_json = json.dumps(document(page))
    page.published_slug = page.slug
    page.published_at = datetime.now(timezone.utc)
    page.revision += 1
    audit(db, shop, page, 'content_published', actor); db.commit(); db.refresh(page)
    return format_page(page, detail=True)


@router.post('/{page_id}/unpublish', response_model=PageResponse)
def unpublish_page(page_id: str, req: PageRevision, shop: Shop = Depends(require_shop_access), db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    page = find_page(db, shop, page_id, req.expected_revision)
    if page.kind == 'page' and page.slug == 'home' and shop.status == 'published':
        raise HTTPException(409, 'Unpublish the website before unpublishing its homepage')
    page.published_json = page.published_slug = page.published_at = None
    page.revision += 1
    audit(db, shop, page, 'content_unpublished', actor); db.commit(); db.refresh(page)
    return format_page(page, detail=True)


@router.delete('/{page_id}', status_code=204)
def delete_page(page_id: str, expected_revision: int = Query(..., ge=1), shop: Shop = Depends(require_shop_access), db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    page = find_page(db, shop, page_id, expected_revision)
    if page.published_json:
        raise HTTPException(409, 'Unpublish this content before deleting it')
    if page.kind == 'page' and page.slug == 'home':
        raise HTTPException(400, 'The homepage cannot be deleted')
    audit(db, shop, page, 'draft_deleted', actor); db.delete(page); db.commit()
