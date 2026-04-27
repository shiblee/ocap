from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.project import Project
from app.models.campaign import Campaign
from app.models.contact import Contact
from typing import List, Optional

class ProjectService:
    @staticmethod
    async def create_project(db: AsyncSession, data: dict):
        project = Project(**data)
        db.add(project)
        await db.commit()
        await db.refresh(project)
        return project

    @staticmethod
    async def get_projects(db: AsyncSession, skip: int = 0, limit: int = 100):
        # We can add summary stats here later if needed
        query = select(Project).order_by(Project.created_at.desc())
        result = await db.execute(query.offset(skip).limit(limit))
        return result.scalars().all()

    @staticmethod
    async def get_project_by_id(db: AsyncSession, project_id: int):
        result = await db.execute(select(Project).where(Project.id == project_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def update_project(db: AsyncSession, project_id: int, data: dict):
        project = await ProjectService.get_project_by_id(db, project_id)
        if not project:
            return None
        
        for key, value in data.items():
            if hasattr(project, key):
                setattr(project, key, value)
        
        await db.commit()
        await db.refresh(project)
        return project

    @staticmethod
    async def delete_project(db: AsyncSession, project_id: int):
        project = await ProjectService.get_project_by_id(db, project_id)
        if not project:
            return False
        
        await db.delete(project)
        await db.commit()
        return True

    @staticmethod
    async def get_project_stats(db: AsyncSession, project_id: int):
        """
        Get aggregated stats specifically for this project.
        """
        # Count campaigns
        campaign_count_query = select(func.count(Campaign.id)).where(Campaign.project_id == project_id)
        campaign_res = await db.execute(campaign_count_query)
        campaign_count = campaign_res.scalar()

        # Count contacts
        contact_count_query = select(func.count(Contact.id)).where(Contact.project_id == project_id)
        contact_res = await db.execute(contact_count_query)
        contact_count = contact_res.scalar()

        return {
            "campaign_count": campaign_count,
            "contact_count": contact_count
        }
