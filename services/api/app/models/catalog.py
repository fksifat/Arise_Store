import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, BigInteger, DateTime, ForeignKey, Boolean, Text, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    shop_id = Column(String(36), ForeignKey("shops.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_id = Column(String(36), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    sort_order = Column(Integer, default=0, nullable=False)
    status = Column(String(50), default="active", nullable=False)  # active, archived
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("shop_id", "slug", name="uq_shop_category_slug"),
    )

    shop = relationship("Shop", back_populates="categories")
    parent = relationship("Category", remote_side=[id])
    product_associations = relationship("ProductCategory", back_populates="category", cascade="all, delete-orphan")

class Product(Base):
    __tablename__ = "products"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    shop_id = Column(String(36), ForeignKey("shops.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="active", nullable=False)  # draft, active, archived
    price_minor = Column(BigInteger, nullable=False)  # in poisha (1 BDT = 100 poisha)
    compare_at_price_minor = Column(BigInteger, nullable=True)
    currency = Column(String(10), default="BDT", nullable=False)
    sku = Column(String(100), nullable=True)
    stock_quantity = Column(Integer, default=0, nullable=False)
    track_inventory = Column(Boolean, default=True, nullable=False)
    is_featured = Column(Boolean, default=False, nullable=False)
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("shop_id", "slug", name="uq_shop_product_slug"),
        CheckConstraint("price_minor >= 0 AND stock_quantity >= 0", name="ck_product_nonnegative"),
    )

    shop = relationship("Shop", back_populates="products")
    category_associations = relationship("ProductCategory", back_populates="product", cascade="all, delete-orphan", lazy="selectin")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan", order_by="ProductImage.sort_order", lazy="selectin")
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan", order_by="(ProductVariant.created_at, ProductVariant.id)", lazy="selectin")

class ProductCategory(Base):
    __tablename__ = "product_categories"

    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), primary_key=True)
    category_id = Column(String(36), ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True)

    product = relationship("Product", back_populates="category_associations")
    category = relationship("Category", back_populates="product_associations")

class ProductImage(Base):
    __tablename__ = "product_images"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    image_url = Column(String(500), nullable=False)
    alt_text = Column(String(255), nullable=True)
    sort_order = Column(Integer, default=0, nullable=False)
    is_primary = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    product = relationship("Product", back_populates="images")

class ProductVariant(Base):
    __tablename__ = "product_variants"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    sku = Column(String(100), nullable=True)
    title = Column(String(255), nullable=False)  # e.g., "Size: M / Color: Blue"
    attributes_json = Column(Text, nullable=True)  # {"size": "M", "color": "Blue"}
    price_minor = Column(BigInteger, nullable=True)  # Override product price if set
    stock_quantity = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    product = relationship("Product", back_populates="variants")
    __table_args__ = (CheckConstraint("(price_minor IS NULL OR price_minor >= 0) AND stock_quantity >= 0", name="ck_variant_nonnegative"),)

