from sqlalchemy import Column, Integer, String, JSON, DateTime
from sqlalchemy.orm import relationship
from app.models.base import Base
from datetime import datetime

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    
    # Configuration fields moved from SystemSettings
    email_config = Column(JSON, default={})
    sms_config = Column(JSON, default={})
    whatsapp_config = Column(JSON, default={})
    push_config = Column(JSON, default={})
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    campaigns = relationship("Campaign", back_populates="project", cascade="all, delete-orphan")
    contacts = relationship("Contact", back_populates="project", cascade="all, delete-orphan")
