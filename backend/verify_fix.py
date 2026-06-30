import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.campaign import Campaign, CampaignChannel, CampaignLog
from app.services.campaign_service import CampaignService

async def verify_fix():
    async with AsyncSessionLocal() as db:
        # 1. Find a social campaign
        result = await db.execute(select(Campaign).where(Campaign.channel == CampaignChannel.SOCIAL_POST))
        campaign = result.scalar_one_or_none()
        
        if not campaign:
            print("No social campaign found. Creating a dummy one...")
            campaign = Campaign(
                name="Test Social Campaign",
                content="Hello World",
                channel=CampaignChannel.SOCIAL_POST,
                project_id=1, # Assume project 1 exists
                social_platforms=["twitter"]
            )
            db.add(campaign)
            await db.commit()
            await db.refresh(campaign)
            print(f"Created dummy campaign {campaign.id}")
        else:
            print(f"Found social campaign {campaign.id}")

        # 2. Check current log count
        result = await db.execute(select(CampaignLog).where(CampaignLog.campaign_id == campaign.id))
        initial_logs = len(result.scalars().all())
        print(f"Initial logs count: {initial_logs}")

        # 3. Run campaign
        print("Running campaign...")
        # Note: We need to mock social gateway or just let it fail/success
        # If it's the real app, it will try to post.
        # But we just want to see if a CampaignLog object is added to db.
        await CampaignService.run_campaign(db, campaign.id)
        
        # 4. Check log count again
        # We need a new session or refresh because run_campaign might have used its own
        # Actually run_campaign takes db as arg.
        
        # We need to wait a bit if it's async? No, run_campaign is awaited in our script.
        
        result = await db.execute(select(CampaignLog).where(CampaignLog.campaign_id == campaign.id))
        final_logs = len(result.scalars().all())
        print(f"Final logs count: {final_logs}")

        if final_logs > initial_logs:
            print("SUCCESS: Log created!")
        else:
            print("FAILURE: No log created.")

if __name__ == "__main__":
    asyncio.run(verify_fix())
