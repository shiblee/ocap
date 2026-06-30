import asyncio
from sqlalchemy import text
from app.db.session import AsyncSessionLocal

async def inspect_enums():
    async with AsyncSessionLocal() as db:
        print("Checking campaignchannel values in Postgres:")
        res = await db.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'campaignchannel'"))
        print(res.all())
        
        print("\nChecking campaignstatus values in Postgres:")
        res = await db.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'campaignstatus'"))
        print(res.all())

if __name__ == "__main__":
    asyncio.run(inspect_enums())
