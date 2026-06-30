import asyncio
from sqlalchemy import select, func
from app.db.session import AsyncSessionLocal
from app.models.project import Project
from app.models.contact import Contact
from app.models.campaign import Campaign, CampaignLog

async def count_contacts():
    async with AsyncSessionLocal() as db:
        # All contacts
        res_all = await db.execute(select(func.count(Contact.id)))
        total = res_all.scalar()
        
        # Contacts with phone
        res_phone = await db.execute(select(func.count(Contact.id)).where(Contact.phone != None))
        with_phone = res_phone.scalar()
        
        # Active contacts with phone
        res_active_phone = await db.execute(select(func.count(Contact.id)).where(Contact.phone != None, Contact.is_active == True))
        active_with_phone = res_active_phone.scalar()
        
        print(f"Total Contacts: {total}")
        print(f"With Phone: {with_phone}")
        print(f"Active with Phone: {active_with_phone}")
        
        # Check specific campaign 8
        camp_res = await db.execute(select(Campaign).where(Campaign.id == 8))
        camp = camp_res.scalar_one_or_none()
        if camp:
            print(f"\nCampaign 8 Status: {camp.status}")
            print(f"Campaign 8 Progress: {camp.sent_count}/{camp.total_contacts}")
            
            # Check logs for campaign 8
            log_res = await db.execute(select(func.count(CampaignLog.id)).where(CampaignLog.campaign_id == 8))
            print(f"Campaign 8 Logs Count: {log_res.scalar()}")

if __name__ == "__main__":
    asyncio.run(count_contacts())
