from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field, field_validator
import re
from app.schemas.catalog import ProductResponse, CategoryResponse
from app.schemas.theme import ShopThemeSettingResponse
from app.schemas.order import OrderResponse
from app.schemas.order import OrderItemResponse
from datetime import datetime

def normalize_phone(value: str) -> str:
    clean = re.sub(r"[^\d+]", "", value)
    if clean.startswith("+88"):
        clean = clean[3:]
    elif clean.startswith("88"):
        clean = clean[2:]
    if not re.fullmatch(r"01[3-9]\d{8}", clean):
        raise ValueError("Please provide a valid Bangladeshi mobile number")
    return clean

class PublicOrderResponse(BaseModel):
    id: str
    order_number: str
    status: str
    payment_method: str
    payment_status: str
    subtotal_minor: int
    delivery_fee_minor: int
    discount_minor: int = 0
    total_minor: int
    currency: str
    customer_name: str
    customer_phone: str
    shipping_city: str
    shipping_address: str
    created_at: datetime
    items: List[OrderItemResponse]

class TrackOrderRequest(BaseModel):
    order_number: str = Field(..., min_length=5, max_length=50)
    phone: str = Field(..., min_length=11, max_length=20)

class CartItemInput(BaseModel):
    product_id: str
    variant_id: Optional[str] = None
    quantity: int = Field(..., ge=1, le=100)

class CartValidationRequest(BaseModel):
    items: List[CartItemInput] = Field(..., min_length=1, max_length=100)
    shipping_city: Literal["Dhaka", "Outside Dhaka"]

class ValidatedCartItem(BaseModel):
    product_id: str
    variant_id: Optional[str]
    name: str
    image_url: Optional[str]
    unit_price_minor: int
    quantity: int
    line_total_minor: int
    in_stock: bool
    available_stock: int

class CartValidationResponse(BaseModel):
    items: List[ValidatedCartItem]
    subtotal_minor: int
    delivery_fee_minor: int
    discount_minor: int = 0
    total_minor: int
    currency: str
    all_in_stock: bool

class PublicCheckoutRequest(BaseModel):
    customer_name: str = Field(..., min_length=2, max_length=100)
    customer_phone: str = Field(..., min_length=11, max_length=20)
    customer_email: Optional[str] = None
    shipping_city: Literal["Dhaka", "Outside Dhaka"]
    shipping_address: str = Field(..., min_length=5, max_length=500)
    customer_note: Optional[str] = Field(None, max_length=1000)
    payment_method: Literal["cod"] = "cod"
    expected_total_minor: Optional[int] = Field(None, ge=0)
    items: List[CartItemInput] = Field(..., min_length=1, max_length=100)

    @field_validator("customer_phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return normalize_phone(v)

class PublicStoreResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str]
    status: str
    default_currency: str
    default_locale: str
    logo_url: Optional[str]
    banner_url: Optional[str]
    discount_percent: int = 0
    contact_email: Optional[str]
    contact_phone: Optional[str]
    address: Optional[str]
    inside_dhaka_delivery_fee_minor: str
    outside_dhaka_delivery_fee_minor: str
    theme: ShopThemeSettingResponse
    categories: List[CategoryResponse]
    featured_products: List[ProductResponse]

