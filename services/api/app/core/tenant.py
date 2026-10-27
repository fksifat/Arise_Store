from typing import Optional
from fastapi import Depends, HTTPException, Header, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.models.shop import Shop, ShopMembership, ShopDomain
from app.config import settings
from app.core.subscriptions import active_subscription

security = HTTPBearer(auto_error=False)

def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials if credentials else request.cookies.get("arise_session")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.id == payload["sub"], User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account inactive or not found",
        )
    return user

def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not credentials:
        return None
    payload = decode_access_token(credentials.credentials)
    if not payload or not payload.get("sub"):
        return None
    return db.query(User).filter(User.id == payload["sub"], User.is_active == True).first()

def require_platform_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "platform_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to platform administrators"
        )
    return current_user

def require_shop_access(
    shop_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Shop:
    """
    Enforces strict tenant boundaries:
    Ensures that the current user owns or is an active member of the specified shop.
    Platform administrators have elevated access.
    """
    query = db.query(Shop).filter(Shop.id == shop_id)
    shop = query.populate_existing().with_for_update().first() if request.method not in ("GET", "HEAD") else query.first()
    if not shop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shop not found")
    
    commerce_routes = ('/products', '/categories', '/orders', '/customers', '/reports')
    if shop.website_type != 'online_store' and any(part in request.url.path for part in commerce_routes):
        raise HTTPException(404, 'Commerce tools are available on online-store websites')
    if current_user.role == "platform_admin":
        return shop

    if shop.status in ("suspended", "archived") and request.method not in ("GET", "HEAD"):
        raise HTTPException(403, "This shop is restricted by platform moderation")

    if shop.owner_user_id == current_user.id:
        return shop

    membership = db.query(ShopMembership).filter(
        ShopMembership.shop_id == shop_id,
        ShopMembership.user_id == current_user.id,
        ShopMembership.status == "active"
    ).first()

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access or modify this shop's resources"
        )
    if request.method not in ("GET", "HEAD"):
        owner_only = any(part in request.url.path for part in ("/domains", "/subscription", "/publish", "/unpublish", "/theme-settings", "/storefront-content")) or request.url.path.endswith(f"/shops/{shop_id}")
        if owner_only or membership.role not in ("manager", "owner"):
            raise HTTPException(403, "This action requires the shop owner or an authorized manager")
    return shop

def resolve_public_tenant(
    request: Request,
    db: Session = Depends(get_db),
    x_shop_slug: Optional[str] = Header(None, alias="X-Shop-Slug")
) -> Shop:
    """
    Resolves the tenant for public storefront requests.
    Supports:
    1. X-Shop-Slug header (useful for API clients & SSR)
    2. Query param ?shop=slug
    3. Hostname parsing (subdomains e.g. 'fashion.arisestore.com' or custom domains)
    """
    slug = x_shop_slug
    shop = None
    if not slug:
        slug = request.query_params.get("shop")
    
    if not slug:
        host = request.headers.get("host", "").split(":")[0].lower()
        if host and host != "localhost" and host != "127.0.0.1" and host != settings.PLATFORM_BASE_DOMAIN:
            # Check custom domain first
            custom_domain = db.query(ShopDomain).filter(
                ShopDomain.hostname == host,
                ShopDomain.verification_status == "verified",
                ShopDomain.routing_status == "active"
            ).first()
            if custom_domain:
                shop = custom_domain.shop
            
            # Check subdomain: {slug}.arisestore.com
            if host.endswith("." + settings.PLATFORM_BASE_DOMAIN):
                slug = host.replace("." + settings.PLATFORM_BASE_DOMAIN, "")

    if not slug and not shop:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Shop tenant identifier not provided. Send via X-Shop-Slug header or ?shop= query parameter."
        )

    if not shop:
        shop = db.query(Shop).filter(Shop.slug == slug.lower()).first()
    if not shop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Shop '{slug}' not found")
    
    if shop.status != "published":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This store is currently not open to the public (Status: {shop.status})"
        )
    if "/orders/track" not in request.url.path:
        active_subscription(db, shop.id)
    return shop



def resolve_public_store(shop: Shop = Depends(resolve_public_tenant)) -> Shop:
    if shop.website_type != 'online_store':
        raise HTTPException(404, 'This website does not have an online store')
    return shop
