import asyncio
from sqlalchemy import text
from app.db.session import AsyncSessionLocal

async def migrate_enums():
    print("Starting database enum migration...")
    async with AsyncSessionLocal() as db:
        try:
            # Update channel values to lowercase
            print("Updating campaign channels...")
            await db.execute(text("UPDATE campaigns SET channel = LOWER(channel::text)::campaignchannel"))
            
            # Update status values to lowercase
            print("Updating campaign statuses...")
            await db.execute(text("UPDATE campaigns SET status = LOWER(status::text)::campaignstatus"))
            
            await db.commit()
            print("Migration successful!")
        except Exception as e:
            print(f"Migration failed: {e}")
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(migrate_enums())
