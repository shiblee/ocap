from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    email_config: Optional[Dict[str, Any]] = {}
    sms_config: Optional[Dict[str, Any]] = {}
    whatsapp_config: Optional[Dict[str, Any]] = {}
    push_config: Optional[Dict[str, Any]] = {}

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(ProjectBase):
    name: Optional[str] = None

class ProjectResponse(ProjectBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
