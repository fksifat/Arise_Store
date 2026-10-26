import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, BigInteger, Integer, DateTime, ForeignKey, Text, UniqueConstraint, Boolean, CheckConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class Order(Base):
    __tablename__ = "orders"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    shop_id = Column(String(36), ForeignKey("shops.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True)
    order_number = Column(String(50), nullable=False)
    idempotency_key = Column(String(100), nullable=True)
    request_hash = Column(String(64), nullable=True)
    status = Column(String(50), default="pending", nullable=False)  # pending, confirmed, processing, ready_to_ship, shipped, delivered, cancelled
    payment_method = Column(String(50), default="cod", nullable=False)  # cod, bkash, nagad, card
    payment_status = Column(String(50), default="unpaid", nullable=False)  # unpaid, pending, paid, refunded, failed
    
    # Financial fields in minor units (poisha)
    subtotal_minor = Column(BigInteger, default=0, nullable=False)
    delivery_fee_minor = Column(BigInteger, default=0, nullable=False)
    discount_minor = Column(BigInteger, default=0, nullable=False)
    total_minor = Column(BigInteger, default=0, nullable=False)
    currency = Column(String(10), default="BDT", nullable=False)
    
    # Shipping details & Notes
    customer_name = Column(String(255), nullable=False)
    customer_phone = Column(String(50), nullable=False)
    customer_email = Column(String(255), nullable=True)
    shipping_city = Column(String(100), nullable=False)  # "Dhaka", "Outside Dhaka"
    shipping_address = Column(Text, nullable=False)
    customer_note = Column(Text, nullable=True)
    admin_note = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("shop_id", "order_number", name="uq_shop_order_number"),
        UniqueConstraint("shop_id", "idempotency_key", name="uq_shop_checkout_key"),
        CheckConstraint("subtotal_minor >= 0 AND delivery_fee_minor >= 0 AND discount_minor >= 0 AND total_minor >= 0", name="ck_order_nonnegative"),
    )

    shop = relationship("Shop", back_populates="orders")
    customer = relationship("Customer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan", lazy="selectin")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(36), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    variant_id = Column(String(36), ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True)
    
    # Immutable historical snapshots
    product_name_snapshot = Column(String(255), nullable=False)
    sku_snapshot = Column(String(100), nullable=True)
    variant_snapshot_json = Column(Text, nullable=True)
    product_image_url_snapshot = Column(String(500), nullable=True)
    unit_price_minor = Column(BigInteger, nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    inventory_deducted = Column(Boolean, default=False, nullable=False)
    line_total_minor = Column(BigInteger, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product")
    variant = relationship("ProductVariant")
    __table_args__ = (CheckConstraint("unit_price_minor >= 0 AND quantity > 0 AND line_total_minor >= 0", name="ck_order_item_amounts"),)

