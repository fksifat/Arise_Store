from typing import Optional, List, Dict, Any, Literal
from app.schemas.base import PatchModel
from datetime import datetime
from pydantic import ConfigDict, BaseModel, Field, field_validator, model_validator
from slugify import slugify
from app.schemas.page import safe_url

# Categories
class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    parent_id: Optional[str] = None
    sort_order: int = 0

    @field_validator("slug", mode="before")
    @classmethod
    def generate_slug(cls, v: Optional[str], values) -> Optional[str]:
        if v:
            return slugify(v)
        return None

class CategoryUpdate(PatchModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    slug: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    parent_id: Optional[str] = None
    sort_order: Optional[int] = None
    status: Optional[Literal["active", "archived"]] = None

class CategoryResponse(BaseModel):
    id: str
    shop_id: str
    parent_id: Optional[str]
    name: str
    slug: str
    description: Optional[str]
    image_url: Optional[str]
    sort_order: int
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)

# Images & Variants
class ProductImageCreate(BaseModel):
    image_url: str = Field(..., min_length=1, max_length=2048)
    alt_text: Optional[str] = None
    sort_order: int = 0
    is_primary: bool = False
    _image = field_validator('image_url')(lambda value: safe_url(value, image=True))

class ProductImageResponse(BaseModel):
    id: str
    product_id: str
    image_url: str
    alt_text: Optional[str]
    sort_order: int
    is_primary: bool

    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)

class ProductVariantCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    title: str = Field(..., min_length=1, max_length=100)
    sku: Optional[str] = Field(None, max_length=100)
    attributes_json: Optional[str] = None
    price_minor: Optional[int] = Field(None, ge=0, le=100000000000)
    stock_quantity: int = Field(0, ge=0, le=1000000000)
    is_active: bool = True

class ProductVariantResponse(BaseModel):
    id: str
    product_id: str
    title: str
    sku: Optional[str]
    attributes_json: Optional[str]
    price_minor: Optional[int]
    stock_quantity: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)

# Products
class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    slug: Optional[str] = None
    description: Optional[str] = None
    price_minor: int = Field(..., ge=0, le=100000000000, description="Price in poisha (100 poisha = 1 BDT)")
    compare_at_price_minor: Optional[int] = Field(None, ge=0, le=100000000000)
    currency: str = "BDT"
    sku: Optional[str] = None
    stock_quantity: int = Field(0, ge=0, le=1000000000)
    track_inventory: bool = True
    is_featured: bool = False
    status: Literal["draft", "active", "archived"] = "active"
    category_ids: List[str] = Field(default_factory=list)
    images: List[ProductImageCreate] = Field(default_factory=list)
    variants: List[ProductVariantCreate] = Field(default_factory=list, max_length=100)

    @field_validator("slug", mode="before")
    @classmethod
    def generate_slug(cls, v: Optional[str], values) -> Optional[str]:
        if v:
            return slugify(v)
        return None

class ProductUpdate(PatchModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    slug: Optional[str] = None
    description: Optional[str] = None
    price_minor: Optional[int] = Field(None, ge=0, le=100000000000)
    compare_at_price_minor: Optional[int] = Field(None, ge=0, le=100000000000)
    sku: Optional[str] = None
    stock_quantity: Optional[int] = Field(None, ge=0, le=1000000000)
    expected_stock_quantity: Optional[int] = Field(None, ge=0, le=1000000000)
    track_inventory: Optional[bool] = None
    is_featured: Optional[bool] = None
    status: Optional[Literal["draft", "active", "archived"]] = None
    category_ids: Optional[List[str]] = None
    images: List[ProductImageCreate] = Field(default_factory=list, max_length=20)

class ProductResponse(BaseModel):
    id: str
    shop_id: str
    name: str
    slug: str
    description: Optional[str]
    status: str
    price_minor: int
    compare_at_price_minor: Optional[int]
    currency: str
    sku: Optional[str]
    stock_quantity: int
    track_inventory: bool
    is_featured: bool
    published_at: Optional[datetime]
    created_at: datetime
    images: List[ProductImageResponse] = Field(default_factory=list)
    variants: List[ProductVariantResponse] = Field(default_factory=list)
    category_ids: List[str] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)



class ProductVariantUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    sku: Optional[str] = Field(None, max_length=100)
    price_minor: Optional[int] = Field(None, ge=0, le=100000000000)
    stock_quantity: Optional[int] = Field(None, ge=0, le=1000000000)
    expected_stock_quantity: Optional[int] = Field(None, ge=0, le=1000000000)
    is_active: Optional[bool] = None

    @model_validator(mode='after')
    def safe_update(self):
        if any(field in self.model_fields_set and getattr(self, field) is None for field in ('title','stock_quantity','expected_stock_quantity','is_active')):
            raise ValueError('Required option fields cannot be null')
        if 'stock_quantity' in self.model_fields_set and self.expected_stock_quantity is None:
            raise ValueError('Include the expected stock quantity when adjusting option stock')
        return self
