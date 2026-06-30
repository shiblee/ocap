import asyncio
from sqlalchemy import text
from app.db.session import AsyncSessionLocal

async def add_is_active_column():
    print("Adding 'is_active' column to contacts table...")
    async with AsyncSessionLocal() as db:
        try:
            # Check if column exists first (to avoid errors)
            res = await db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='contacts' AND column_name='is_active'"))
            if not res.scalar():
                await db.execute(text("ALTER TABLE contacts ADD COLUMN is_active BOOLEAN DEFAULT TRUE"))
                await db.commit()
                print("Column 'is_active' added successfully!")
            else:
                print("Column 'is_active' already exists.")
        except Exception as e:
            print(f"Error: {e}")
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(add_is_active_column())
