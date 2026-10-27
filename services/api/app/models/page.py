import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class SitePage(Base):
    __tablename__ = 'site_pages'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    shop_id = Column(String(36), ForeignKey('shops.id', ondelete='CASCADE'), nullable=False, index=True)
    kind = Column(String(10), nullable=False, default='page')
    title = Column(String(160), nullable=False)
    slug = Column(String(80), nullable=False)
    description = Column(String(300), nullable=False, default='')
    sections_json = Column(Text, nullable=False, default='[]')
    published_json = Column(Text, nullable=True)
    published_slug = Column(String(80), nullable=True)
    published_at = Column(DateTime, nullable=True)
    revision = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    shop = relationship('Shop', back_populates='pages')
    __table_args__ = (
        UniqueConstraint('shop_id', 'kind', 'slug', name='uq_site_page_slug'),
        UniqueConstraint('shop_id', 'kind', 'published_slug', name='uq_site_page_published_slug'),
        CheckConstraint("kind IN ('page', 'post') AND revision >= 1", name='ck_site_page_kind_revision'),
    )
