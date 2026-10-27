from typing import Optional
from datetime import datetime
from pydantic import ConfigDict, BaseModel, Field, field_validator
from slugify import slugify
from app.core.constants import RESERVED_SLUGS
from app.schemas.base import PatchModel
from app.schemas.page import WebsiteType, safe_url
import re

def delivery_fee(value):
    if value is not None and (not value.isdigit() or not 0 <= int(value) <= 10000000):
        raise ValueError("Delivery fee must be a nonnegative amount in poisha")
    return value

class ShopCreate(BaseModel):
    website_type: WebsiteType = 'online_store'
    name: str = Field(..., min_length=2, max_length=100)
    slug: str = Field(..., min_length=3, max_length=50)
    description: Optional[str] = None
    default_currency: str = "BDT"
    default_locale: str = "bn_BD"
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    inside_dhaka_delivery_fee_minor: str = "6000"
    outside_dhaka_delivery_fee_minor: str = "12000"
    theme_key: Optional[str] = None
    _fees = field_validator("inside_dhaka_delivery_fee_minor", "outside_dhaka_delivery_fee_minor")(delivery_fee)

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str) -> str:
        clean = slugify(v)
        if len(clean) < 3:
            raise ValueError("Slug must be at least 3 characters long after normalization")
        if clean in RESERVED_SLUGS:
            raise ValueError(f"'{clean}' is a reserved platform keyword and cannot be used as a shop slug")
        return clean

class ShopUpdate(PatchModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    inside_dhaka_delivery_fee_minor: Optional[str] = None
    outside_dhaka_delivery_fee_minor: Optional[str] = None
    _fees = field_validator("inside_dhaka_delivery_fee_minor", "outside_dhaka_delivery_fee_minor")(delivery_fee)
    _logo = field_validator('logo_url')(lambda value: safe_url(value, image=True) if value else None)


class ShopResponse(BaseModel):
    id: str
    owner_user_id: str
    name: str
    slug: str
    website_type: WebsiteType
    description: Optional[str]
    status: str
    default_currency: str
    default_locale: str
    logo_url: Optional[str]
    banner_url: Optional[str]
    contact_email: Optional[str]
    contact_phone: Optional[str]
    address: Optional[str]
    inside_dhaka_delivery_fee_minor: str
    outside_dhaka_delivery_fee_minor: str
    published_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)

class ShopDomainCreate(BaseModel):
    hostname: str = Field(..., min_length=4, max_length=255)

    @field_validator("hostname")
    @classmethod
    def valid_hostname(cls, value):
        value = value.strip().lower().rstrip(".").encode("idna").decode("ascii")
        if len(value) > 253 or not re.fullmatch(r"(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}", value):
            raise ValueError("Enter a hostname without a scheme, path, port or IP address")
        return value

class ShopDomainResponse(BaseModel):
    id: str
    shop_id: str
    hostname: str
    domain_type: str
    verification_status: str
    routing_status: str
    verified_at: Optional[datetime]
    created_at: datetime
    verification_record: Optional[str] = None
    verification_value: Optional[str] = None

    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)

