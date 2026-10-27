import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint, Text
from sqlalchemy.orm import relationship
from app.database import Base

class Shop(Base):
    __tablename__ = "shops"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    website_type = Column(String(30), nullable=False, default='online_store', server_default='online_store')
    description = Column(Text, nullable=True)
    status = Column(String(50), default="draft", nullable=False)  # draft, published, suspended, archived
    default_currency = Column(String(10), default="BDT", nullable=False)
    default_locale = Column(String(10), default="bn_BD", nullable=False)
    logo_url = Column(String(500), nullable=True)
    banner_url = Column(String(500), nullable=True)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    inside_dhaka_delivery_fee_minor = Column(String(20), default="6000", nullable=False)  # 60.00 BDT in poisha
    outside_dhaka_delivery_fee_minor = Column(String(20), default="12000", nullable=False) # 120.00 BDT in poisha
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    owner = relationship("User", foreign_keys=[owner_user_id])
    memberships = relationship("ShopMembership", back_populates="shop", cascade="all, delete-orphan")
    domains = relationship("ShopDomain", back_populates="shop", cascade="all, delete-orphan")
    theme_settings = relationship("ShopThemeSetting", back_populates="shop", uselist=False, cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="shop", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="shop", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="shop", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="shop", cascade="all, delete-orphan")
    pages = relationship('SitePage', back_populates='shop', cascade='all, delete-orphan')

class ShopMembership(Base):
    __tablename__ = "shop_memberships"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    shop_id = Column(String(36), ForeignKey("shops.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(50), default="owner", nullable=False)  # owner, manager, staff
    status = Column(String(50), default="active", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("shop_id", "user_id", name="uq_shop_user"),
    )

    shop = relationship("Shop", back_populates="memberships")
    user = relationship("User")

class ShopDomain(Base):
    __tablename__ = "shop_domains"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    shop_id = Column(String(36), ForeignKey("shops.id", ondelete="CASCADE"), nullable=False, index=True)
    hostname = Column(String(255), unique=True, index=True, nullable=False)
    domain_type = Column(String(50), default="custom_domain", nullable=False)  # platform_subdomain, custom_domain
    verification_status = Column(String(50), default="pending", nullable=False)  # pending, verified, failed
    routing_status = Column(String(50), default="inactive", nullable=False)  # active, inactive
    verified_at = Column(DateTime, nullable=True)
    verification_token = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    shop = relationship("Shop", back_populates="domains")

