import asyncio
from app.db.session import engine
from sqlalchemy import text

async def fix():
    async with engine.connect() as conn:
        try:
            await conn.execute(text("ALTER TYPE campaignchannel ADD VALUE 'SOCIAL_POST'"))
            await conn.commit()
            print("Successfully added SOCIAL_POST (UPPERCASE) to campaignchannel enum")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(fix())
