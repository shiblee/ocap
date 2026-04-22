from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from fastapi.encoders import jsonable_encoder
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.services.campaign_service import CampaignService
from app.api.auth import get_current_user
from typing import List, Optional

router = APIRouter(prefix="/campaigns", tags=["campaigns"])

@router.post("/")
async def create_campaign(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Create a new campaign as DRAFT.
    """
    campaign = await CampaignService.create_campaign(db, data)
    return jsonable_encoder(campaign)

@router.post("/{campaign_id}/start")
async def start_campaign(
    campaign_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Manually start or resume a campaign.
    """
    campaign = await CampaignService.get_campaign_by_id(db, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
        
    # Trigger execution in background
    background_tasks.add_task(CampaignService.run_campaign, db, campaign.id)
    
    return {"message": "Campaign started successfully"}

@router.delete("/{campaign_id}")
async def delete_campaign(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Permanently delete a campaign.
    """
    success = await CampaignService.delete_campaign(db, campaign_id)
    if not success:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"message": "Campaign deleted successfully"}

@router.get("/")
async def list_campaigns(
    skip: int = Query(0),
    limit: int = Query(20),
    search: Optional[str] = Query(None),
    project_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    List all campaigns with search, pagination, and project filter.
    """
    campaigns = await CampaignService.get_campaigns(db, project_id, skip, limit, search)
    return jsonable_encoder(campaigns)

@router.get("/{campaign_id}")
async def get_campaign(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get campaign details by ID.
    """
    campaign = await CampaignService.get_campaign_by_id(db, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return jsonable_encoder(campaign)

@router.put("/{campaign_id}")
async def update_campaign(
    campaign_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update campaign details.
    """
    campaign = await CampaignService.update_campaign(db, campaign_id, data)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return jsonable_encoder(campaign)

@router.patch("/{campaign_id}/stop")
async def stop_campaign(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Stop an active campaign.
    """
    success = await CampaignService.stop_campaign(db, campaign_id)
    if not success:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"message": "Campaign stopped successfully"}
