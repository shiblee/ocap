import asyncio
from sqlalchemy import text
from app.db.session import AsyncSessionLocal

async def reset_campaign():
    async with AsyncSessionLocal() as db:
        print("Resetting campaign 8...")
        await db.execute(text("UPDATE campaigns SET status='draft', sent_count=0, total_contacts=0 WHERE id=8"))
        await db.commit()
        print("Campaign 8 reset successfully!")

if __name__ == "__main__":
    asyncio.run(reset_campaign())
