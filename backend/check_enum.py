import asyncio
from app.db.session import engine
from sqlalchemy import text

async def check():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT n.nspname as schema, t.typname as type, e.enumlabel as value FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'campaignchannel'"))
        for row in res:
            print(row)

if __name__ == "__main__":
    asyncio.run(check())
