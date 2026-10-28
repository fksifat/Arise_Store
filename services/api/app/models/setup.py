from sqlalchemy import Column, ForeignKey, String, Text
from app.database import Base


class SetupDraft(Base):
    __tablename__ = 'setup_drafts'

    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    data_json = Column(Text, nullable=False)
