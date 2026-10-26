import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text
from app.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    actor_user_id = Column(String(36), nullable=True, index=True)
    shop_id = Column(String(36), nullable=True, index=True)
    action = Column(String(100), nullable=False)  # e.g., "shop.suspend", "order.status_change"
    resource_type = Column(String(50), nullable=False)  # e.g., "shop", "order", "product"
    resource_id = Column(String(36), nullable=True)
    details_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

