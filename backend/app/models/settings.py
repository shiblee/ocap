from sqlalchemy import Column, Integer, String, JSON
from app.models.base import Base

class SystemSettings(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    app_name = Column(String, default="OCAP")
    logo_url = Column(String, nullable=True)
    copyright_text = Column(String, default="© 2026 OCAP. All rights reserved.")
    
    # Theme Colors (HEX)
    primary_color = Column(String, default="#6366f1")
    secondary_color = Column(String, default="#a855f7")
    background_color = Column(String, default="#0f172a") # Dark slate
