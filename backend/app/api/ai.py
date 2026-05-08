from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.api.auth import get_current_user
from app.services.ai_service import AIService
from app.models.project import Project
from sqlalchemy import select

router = APIRouter(prefix="/ai", tags=["ai"])

@router.post("/generate-post")
async def generate_post(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    project_id = data.get("project_id")
    platform = data.get("platform", "general")
    
    if not project_id:
        raise HTTPException(status_code=400, detail="Project ID is required")
        
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    ai_conf = project.ai_config or {}
    api_key = ai_conf.get("gemini_api_key")
    
    if not api_key:
        raise HTTPException(status_code=400, detail="Gemini API Key not configured in Project Settings")
        
    content = await AIService.generate_social_post(
        project.description or project.name,
        platform=platform,
        api_key=api_key
    )
    
    return {"content": content}
