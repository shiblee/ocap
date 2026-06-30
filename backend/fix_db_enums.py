import asyncio
from sqlalchemy import text
from app.db.session import AsyncSessionLocal

async def fix_postgres_enums():
    async with AsyncSessionLocal() as db:
        print("Adding lowercase values to campaignchannel...")
        channels = ['email', 'sms', 'web_push', 'ios_push', 'android_push', 'whatsapp', 'social_post']
        for ch in channels:
            try:
                # We use commit=True for each to avoid transaction issues with ALTER TYPE
                await db.execute(text(f"ALTER TYPE campaignchannel ADD VALUE IF NOT EXISTS '{ch}'"))
                await db.commit()
            except Exception as e:
                print(f"Skip {ch}: {e}")
                await db.rollback()

        print("\nAdding lowercase values to campaignstatus...")
        statuses = ['draft', 'scheduled', 'sending', 'paused', 'stopped', 'completed', 'failed']
        for st in statuses:
            try:
                await db.execute(text(f"ALTER TYPE campaignstatus ADD VALUE IF NOT EXISTS '{st}'"))
                await db.commit()
            except Exception as e:
                print(f"Skip {st}: {e}")
                await db.rollback()
        
        print("\nNow updating existing data to lowercase...")
        try:
            await db.execute(text("UPDATE campaigns SET channel = LOWER(channel::text)::campaignchannel"))
            await db.execute(text("UPDATE campaigns SET status = LOWER(status::text)::campaignstatus"))
            await db.commit()
            print("Data migration successful!")
        except Exception as e:
            print(f"Data migration failed: {e}")
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(fix_postgres_enums())
