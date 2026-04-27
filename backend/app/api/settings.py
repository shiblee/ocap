from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.models.settings import SystemSettings
from sqlalchemy import select

from app.api.auth import get_current_user
from app.services.test_service import TestService

router = APIRouter(prefix="/settings", tags=["settings"])

@router.post("/test-connection")
async def test_connection(
    data: dict,
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Test a channel configuration by sending a test message for a specific project.
    """
    channel = data.get("channel")
    recipient = data.get("recipient")
    
    if not channel or not recipient:
        raise HTTPException(status_code=400, detail="Channel and Recipient are required.")
        
    success = False
    message = ""
    
    if channel == "email":
        success, message = await TestService.test_email(db, project_id, recipient)
    elif channel == "sms":
        success, message = await TestService.test_sms(db, project_id, recipient)
    elif channel == "whatsapp":
        success, message = await TestService.test_whatsapp(db, project_id, recipient)
    else:
        raise HTTPException(status_code=400, detail="Invalid channel for testing.")
        
    if not success:
        raise HTTPException(status_code=400, detail=message)
        
    return {"message": message}

@router.get("")
async def get_settings(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Retrieve all system settings."""
    result = await db.execute(select(SystemSettings))
    settings = result.scalar_one_or_none()
    
    if not settings:
        settings = SystemSettings()
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
        
    return jsonable_encoder(settings)

@router.get("/project/{project_id}")
async def get_project_settings(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Retrieve settings for a specific project."""
    from app.models.project import Project
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return jsonable_encoder(project)

@router.put("/project/{project_id}")
async def update_project_settings(
    project_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update settings for a specific project."""
    from app.services.project_service import ProjectService
    project = await ProjectService.update_project(db, project_id, data)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project settings updated successfully"}

@router.put("")
async def update_settings(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update system settings (Admin only)."""
    result = await db.execute(select(SystemSettings))
    settings = result.scalar_one_or_none()
    
    if not settings:
        settings = SystemSettings()
        db.add(settings)

    for key, value in data.items():
        if hasattr(settings, key):
            setattr(settings, key, value)
            
    await db.commit()
    return {"message": "Settings updated successfully"}
