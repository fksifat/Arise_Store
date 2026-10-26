import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, BigInteger, Integer, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from app.database import Base

class Plan(Base):
    __tablename__ = "plans"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    slug = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    price_monthly_minor = Column(BigInteger, nullable=False)  # e.g., 49900 = ৳499
    price_annual_minor = Column(BigInteger, nullable=False)   # e.g., 499000 = ৳4,990 (discounted)
    currency = Column(String(10), default="BDT", nullable=False)
    product_limit = Column(Integer, default=100, nullable=False)
    custom_domain_allowed = Column(Boolean, default=False, nullable=False)
    features_json = Column(Text, nullable=False)  # JSON array of feature descriptions
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    shop_id = Column(String(36), ForeignKey("shops.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id = Column(String(36), ForeignKey("plans.id", ondelete="RESTRICT"), nullable=False)
    status = Column(String(50), default="trial", nullable=False)  # trial, active, past_due, suspended, cancelled, expired
    billing_interval = Column(String(20), default="monthly", nullable=False)  # monthly, annual
    starts_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    current_period_start = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    current_period_end = Column(DateTime, nullable=False)
    trial_ends_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    shop = relationship("Shop", back_populates="subscriptions")
    plan = relationship("Plan")
    payments = relationship("Payment", back_populates="subscription", cascade="all, delete-orphan")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    shop_id = Column(String(36), ForeignKey("shops.id", ondelete="CASCADE"), nullable=False, index=True)
    subscription_id = Column(String(36), ForeignKey("subscriptions.id", ondelete="SET NULL"), nullable=True, index=True)
    plan_id = Column(String(36), ForeignKey("plans.id", ondelete="RESTRICT"), nullable=True)
    billing_interval = Column(String(20), nullable=True)
    provider = Column(String(50), default="manual", nullable=False)  # bKash, SSLCommerz, Shurjopay, manual
    provider_reference = Column(String(255), unique=True, nullable=True)
    amount_minor = Column(BigInteger, nullable=False)
    currency = Column(String(10), default="BDT", nullable=False)
    status = Column(String(50), default="pending", nullable=False)
    verified_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    subscription = relationship("Subscription", back_populates="payments")

