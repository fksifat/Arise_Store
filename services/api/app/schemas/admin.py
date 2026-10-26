from typing import Optional, List, Literal
from datetime import datetime
from pydantic import ConfigDict, BaseModel
from app.schemas.shop import ShopResponse

class AdminMetricsResponse(BaseModel):
    total_shops: int
    published_shops: int
    total_products: int
    total_orders: int
    total_revenue_minor: int
    mrr_estimate_minor: int

class ShopStatusUpdate(BaseModel):
    status: Literal["draft", "published", "suspended", "archived"]
    reason: Optional[str] = None

class AdminAuditLogResponse(BaseModel):
    id: str
    actor_user_id: Optional[str]
    shop_id: Optional[str]
    action: str
    resource_type: str
    resource_id: Optional[str]
    details_json: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)

