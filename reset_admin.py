import asyncio
import os
import sys

# Ensure we can find the app package
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(current_dir, "backend")
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.core.security import get_password_hash
from sqlalchemy import select

async def reset_admin():
    print("Resetting Admin Password...")
    async with AsyncSessionLocal() as db:
        admin_email = "admin@ocap.com"
        result = await db.execute(select(User).where(User.email == admin_email))
        admin = result.scalar_one_or_none()
        
        if admin:
            print(f"Updating password for: {admin_email}")
            admin.hashed_password = get_password_hash("admin123")
            admin.is_active = True
            await db.commit()
            print("Password updated successfully!")
        else:
            print("Admin user NOT FOUND! Creating new one...")
            new_admin = User(
                email=admin_email,
                hashed_password=get_password_hash("admin123"),
                full_name="System Administrator",
                role="admin",
                is_active=True
            )
            db.add(new_admin)
            await db.commit()
            print("Admin user created successfully!")

if __name__ == "__main__":
    asyncio.run(reset_admin())
