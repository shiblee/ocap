from sqlalchemy import Column, String, Integer, DateTime, JSON, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base
import enum
from datetime import datetime

class CampaignChannel(str, enum.Enum):
    email = "email"
    sms = "sms"
    web_push = "web_push"
    ios_push = "ios_push"
    android_push = "android_push"
    whatsapp = "whatsapp"
    social_post = "social_post"

class CampaignStatus(str, enum.Enum):
    draft = "draft"
    scheduled = "scheduled"
    sending = "sending"
    paused = "paused"
    stopped = "stopped"
    completed = "completed"
    failed = "failed"

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    subject = Column(String, nullable=True) # Used for Email
    content = Column(String, nullable=False) # Body content
    
    channel = Column(SQLEnum(CampaignChannel), default=CampaignChannel.email)
    status = Column(SQLEnum(CampaignStatus), default=CampaignStatus.draft)
    
    # Progress tracking
    total_contacts = Column(Integer, default=0)
    sent_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    
    # Meta
    scheduled_at = Column(DateTime, nullable=True)
    is_recurring = Column(Integer, default=0) # 0 = No, 1 = Yes
    recurrence_interval = Column(String, nullable=True) # daily, weekly, monthly
    social_platforms = Column(JSON, default=[]) # e.g. ['facebook', 'twitter']
    design = Column(JSON, nullable=True) # For Unlayer/drag-and-drop JSON
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Project association
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    project = relationship("Project", back_populates="campaigns")
    
    logs = relationship("CampaignLog", back_populates="campaign", cascade="all, delete-orphan")

class CampaignLog(Base):
    __tablename__ = "campaign_logs"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False)
    contact_id = Column(Integer, ForeignKey("contacts.id", ondelete="CASCADE"), nullable=True)
    
    status = Column(String, nullable=False) # "success", "failed", "sent_to_ses", "delivered", "bounced"
    error_message = Column(String, nullable=True)
    message_id = Column(String, nullable=True, index=True) # AWS SES MessageId
    sent_at = Column(DateTime, default=datetime.utcnow)

    campaign = relationship("Campaign", back_populates="logs")
    contact = relationship("Contact")
