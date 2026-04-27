import asyncio
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.settings import SystemSettings
from app.core.security import get_password_hash
from sqlalchemy import select

async def seed_data():
    print("Seeding OCAP Database...")
    
    async with AsyncSessionLocal() as db:
        # 1. Seed Admin User
        admin_email = "admin@ocap.com"
        result = await db.execute(select(User).where(User.email == admin_email))
        admin = result.scalar_one_or_none()
        
        if not admin:
            print(f"Creating default Admin: {admin_email}")
            new_admin = User(
                email=admin_email,
                hashed_password=get_password_hash("admin123"),
                full_name="System Administrator",
                role="admin",
                is_active=True
            )
            db.add(new_admin)
        else:
            print(f"Admin user already exists ({admin_email}).")

        # 2. Seed System Settings
        result = await db.execute(select(SystemSettings))
        settings = result.scalar_one_or_none()
        
        if not settings:
            print("Initializing System Settings...")
            new_settings = SystemSettings(
                app_name="OCAP",
                copyright_text="© 2026 OCAP. All rights reserved.",
                logo_url=""
            )
            db.add(new_settings)
        else:
            print("System settings already initialized.")
        
        await db.commit()
    
    print("Seeding complete!")

if __name__ == "__main__":
    asyncio.run(seed_data())
