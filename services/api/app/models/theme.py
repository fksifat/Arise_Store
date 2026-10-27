import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from app.database import Base

class Theme(Base):
    __tablename__ = "themes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    theme_key = Column(String(100), unique=True, index=True, nullable=False)
    website_type = Column(String(30), nullable=False, default='online_store', server_default='online_store')
    name = Column(String(255), nullable=False)
    version = Column(String(50), default="1.0.0", nullable=False)
    description = Column(Text, nullable=True)
    preview_image_url = Column(String(500), nullable=True)
    configuration_schema = Column(Text, nullable=False)  # JSON schema string
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

class ShopThemeSetting(Base):
    __tablename__ = "shop_theme_settings"

    shop_id = Column(String(36), ForeignKey("shops.id", ondelete="CASCADE"), primary_key=True)
    theme_id = Column(String(36), ForeignKey("themes.id", ondelete="RESTRICT"), nullable=False)
    theme_version = Column(String(50), default="1.0.0", nullable=False)
    settings_json = Column(Text, nullable=False)  # JSON configuration string
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    shop = relationship("Shop", back_populates="theme_settings")
    theme = relationship("Theme")

