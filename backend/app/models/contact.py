from sqlalchemy import Column, Integer, String, Boolean, JSON, Index, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin

class Contact(Base, TimestampMixin):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    user_name = Column(String, nullable=True)
    email = Column(String, index=True, nullable=True)
    phone = Column(String, index=True, nullable=True)
    
    # Project association
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    project = relationship("Project", back_populates="contacts")
    
    # Push Tokens
    web_token = Column(String, nullable=True)
    ios_token = Column(String, nullable=True)
    android_token = Column(String, nullable=True)
    
    # Subscription status per channel
    email_active = Column(Boolean, default=True)
    sms_active = Column(Boolean, default=True)
    whatsapp_active = Column(Boolean, default=True)
    push_active = Column(Boolean, default=True)
    
    # Store dynamic fields (e.g., city, age, order_id)
    attributes = Column(JSON, default=dict)
    
    # Unique constraints per project
    __table_args__ = (
        Index('idx_contact_email_phone', "email", "phone"),
        UniqueConstraint('project_id', 'email', name='uq_contact_project_email'),
        UniqueConstraint('project_id', 'phone', name='uq_contact_project_phone'),
    )
