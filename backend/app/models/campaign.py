from sqlalchemy import Column, String, Integer, DateTime, JSON, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base
import enum
from datetime import datetime

class CampaignChannel(str, enum.Enum):
    EMAIL = "email"
    SMS = "sms"
    WEB_PUSH = "web_push"
    IOS_PUSH = "ios_push"
    ANDROID_PUSH = "android_push"
    WHATSAPP = "whatsapp"

class CampaignStatus(str, enum.Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    SENDING = "sending"
    PAUSED = "paused"
    STOPPED = "stopped"
    COMPLETED = "completed"
    FAILED = "failed"

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    subject = Column(String, nullable=True) # Used for Email
    content = Column(String, nullable=False) # Body content
    
    channel = Column(SQLEnum(CampaignChannel), default=CampaignChannel.EMAIL)
    status = Column(SQLEnum(CampaignStatus), default=CampaignStatus.DRAFT)
    
    # Progress tracking
    total_contacts = Column(Integer, default=0)
    sent_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    
    # Meta
    scheduled_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Project association
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    project = relationship("Project", back_populates="campaigns")
    
    # Audit
    # created_by = Column(Integer, ForeignKey("users.id"))
    # user = relationship("User", back_populates="campaigns")
