from typing import Optional, List, Literal
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class PlanResponse(BaseModel):
    id: str
    slug: str
    name: str
    price_monthly_minor: int
    price_annual_minor: int
    currency: str
    product_limit: int
    custom_domain_allowed: bool
    features: List[str]
    is_active: bool

    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)

class SubscriptionResponse(BaseModel):
    id: str
    shop_id: str
    plan_id: str
    plan_name: str
    status: str
    billing_interval: str
    starts_at: datetime
    current_period_start: datetime
    current_period_end: datetime
    trial_ends_at: Optional[datetime]
    cancelled_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)

class UpgradeSubscriptionRequest(BaseModel):
    plan_slug: str = Field(..., min_length=1, max_length=50)
    billing_interval: Literal["monthly", "annual"] = "monthly"
    payment_method: Literal["manual"] = "manual"

class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    shop_id: str
    plan_id: Optional[str]
    billing_interval: Optional[str]
    amount_minor: int
    currency: str
    status: str
    provider_reference: Optional[str]
    created_at: datetime
    verified_at: Optional[datetime]

class VerifyPaymentRequest(BaseModel):
    provider_reference: str = Field(..., min_length=6, max_length=255)
    reason: str = Field(..., min_length=5, max_length=1000)

