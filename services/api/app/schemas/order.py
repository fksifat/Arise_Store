from typing import Optional, List
from datetime import datetime
from pydantic import ConfigDict, BaseModel, Field

class OrderItemResponse(BaseModel):
    id: str
    order_id: str
    product_id: Optional[str]
    variant_id: Optional[str]
    product_name_snapshot: str
    sku_snapshot: Optional[str]
    variant_snapshot_json: Optional[str]
    variant_title_snapshot: Optional[str] = None
    product_image_url_snapshot: Optional[str]
    unit_price_minor: int
    quantity: int
    line_total_minor: int

    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)

class OrderResponse(BaseModel):
    id: str
    shop_id: str
    order_number: str
    status: str
    payment_method: str
    payment_status: str
    subtotal_minor: int
    delivery_fee_minor: int
    discount_minor: int
    total_minor: int
    currency: str
    customer_name: str
    customer_phone: str
    customer_email: Optional[str]
    shipping_city: str
    shipping_address: str
    customer_note: Optional[str]
    admin_note: Optional[str]
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemResponse] = Field(default_factory=list)
    allowed_statuses: List[str] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)

class OrderStatusUpdate(BaseModel):
    status: str
    admin_note: Optional[str] = None

