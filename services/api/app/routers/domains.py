from typing import List
from datetime import datetime, timezone
import secrets
import dns.resolver
from app.config import settings
from app.core.subscriptions import active_subscription
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.shop import Shop, ShopDomain
from app.core.tenant import require_shop_access
from app.schemas.shop import ShopDomainCreate, ShopDomainResponse

router = APIRouter(prefix="/shops/{shop_id}/domains", tags=["Domains"])

def domain_response(domain):
    result = ShopDomainResponse.model_validate(domain)
    if domain.domain_type == "custom_domain":
        result.verification_record = f"_arise-verification.{domain.hostname}"
        result.verification_value = f"arise={domain.verification_token}"
    return result

def domain_entitlement(db, shop):
    sub = active_subscription(db, shop.id)
    if not sub.plan.custom_domain_allowed:
        raise HTTPException(403, "Your plan does not include custom domains")

@router.get("", response_model=List[ShopDomainResponse])
def list_domains(
    shop: Shop = Depends(require_shop_access),
    db: Session = Depends(get_db)
):
    domains = db.query(ShopDomain).filter(ShopDomain.shop_id == shop.id).all()
    return [domain_response(d) for d in domains]

@router.post("", response_model=ShopDomainResponse, status_code=status.HTTP_201_CREATED)
def add_custom_domain(
    req: ShopDomainCreate,
    shop: Shop = Depends(require_shop_access),
    db: Session = Depends(get_db)
):
    domain_entitlement(db, shop)
    clean_host = req.hostname.strip().lower()
    if clean_host == settings.PLATFORM_BASE_DOMAIN or clean_host.endswith("." + settings.PLATFORM_BASE_DOMAIN):
        raise HTTPException(400, "Platform hostnames cannot be added as custom domains")
    # Check uniqueness
    existing = db.query(ShopDomain).filter(ShopDomain.hostname == clean_host).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"The domain '{clean_host}' is already connected to another store on the platform"
        )

    domain = ShopDomain(
        shop_id=shop.id,
        hostname=clean_host,
        domain_type="custom_domain",
        verification_status="pending",
        routing_status="inactive",
        verification_token=secrets.token_hex(24)
    )
    db.add(domain)
    db.commit()
    db.refresh(domain)
    return domain_response(domain)

@router.post("/{domain_id}/verify", response_model=ShopDomainResponse)
def verify_custom_domain(
    domain_id: str,
    shop: Shop = Depends(require_shop_access),
    db: Session = Depends(get_db)
):
    domain_entitlement(db, shop)
    domain = db.query(ShopDomain).filter(
        ShopDomain.id == domain_id,
        ShopDomain.shop_id == shop.id
    ).first()
    if not domain:
        raise HTTPException(status_code=404, detail="Domain mapping not found")

    if domain.domain_type != "custom_domain":
        raise HTTPException(400, "Platform subdomains do not require verification")
    if not domain.verification_token:
        domain.verification_token = secrets.token_hex(24)
        db.commit()
        raise HTTPException(409, "Verification token created. Reload the page to view your DNS record.")
    try:
        records = dns.resolver.resolve(f"_arise-verification.{domain.hostname}", "TXT", lifetime=5)
        values = [b"".join(record.strings).decode() for record in records]
    except (dns.exception.DNSException, UnicodeError):
        raise HTTPException(409, "Verification TXT record not found. Check DNS and try again after propagation.")
    if not any(secrets.compare_digest(value, f"arise={domain.verification_token}") for value in values):
        raise HTTPException(409, "DNS verification token does not match")
    domain.verification_status = "verified"
    domain.routing_status = "inactive"
    domain.verified_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(domain)
    return domain_response(domain)

@router.delete("/{domain_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_domain(
    domain_id: str,
    shop: Shop = Depends(require_shop_access),
    db: Session = Depends(get_db)
):
    domain = db.query(ShopDomain).filter(
        ShopDomain.id == domain_id,
        ShopDomain.shop_id == shop.id
    ).first()
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found")

    if domain.domain_type == "platform_subdomain":
        raise HTTPException(status_code=400, detail="Cannot remove default platform subdomain")

    db.delete(domain)
    db.commit()
    return None

