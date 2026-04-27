import asyncio
import logging
from datetime import datetime
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.campaign import Campaign, CampaignStatus
from app.services.campaign_service import CampaignService

logger = logging.getLogger(__name__)

async def run_scheduler():
    """
    Background loop that checks for scheduled campaigns every 60 seconds
    and triggers them if their scheduled time has arrived.
    """
    logger.info("Campaign Scheduler started...")
    while True:
        try:
            async with AsyncSessionLocal() as db:
                now = datetime.utcnow()
                
                # Query scheduled campaigns that are due
                query = select(Campaign).where(
                    Campaign.status == CampaignStatus.SCHEDULED,
                    Campaign.scheduled_at <= now
                )
                
                result = await db.execute(query)
                due_campaigns = result.scalars().all()
                
                for campaign in due_campaigns:
                    logger.info(f"Triggering scheduled campaign {campaign.id} ({campaign.name})")
                    # We can directly run the campaign. run_campaign will handle changing status to SENDING
                    # We shouldn't await this directly if it takes a long time, so we create a background task for it
                    asyncio.create_task(CampaignService.run_campaign(db, campaign.id))
                    
        except Exception as e:
            logger.error(f"Error in scheduler loop: {e}")
            
        await asyncio.sleep(60) # Check every minute
