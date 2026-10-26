from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel
from app.schemas.order import OrderResponse


class CustomerSummary(BaseModel):
    id: str
    name: str
    phone: str
    email: Optional[str]
    total_orders: int
    delivered_orders: int
    cancelled_orders: int
    returned_orders: int
    delivered_value_minor: int
    last_order_at: Optional[datetime]


class CustomerPage(BaseModel):
    items: list[CustomerSummary]
    total: int
    page: int
    page_size: int


class CustomerHistory(CustomerSummary):
    orders: list[OrderResponse]
    has_more_orders: bool


class DailyReport(BaseModel):
    date: date
    orders: int = 0
    delivered_value_minor: int = 0


class TopProduct(BaseModel):
    name: str
    units: int
    item_value_minor: int


class SalesReport(BaseModel):
    start_date: date
    end_date: date
    timezone: str = 'Asia/Dhaka'
    metrics: dict[str, int]
    statuses: dict[str, int]
    daily: list[DailyReport]
    top_products: list[TopProduct]
