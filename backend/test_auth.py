import asyncio
import os
import sys
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.core.security import get_password_hash, verify_password
from sqlalchemy import select

async def test_auth():
    print("Testing Admin Auth...")
    async with AsyncSessionLocal() as db:
        admin_email = "admin@ocap.com"
        result = await db.execute(select(User).where(User.email == admin_email))
        admin = result.scalar_one_or_none()
        
        if admin:
            print(f"User found: {admin.email}")
            print(f"Hashed Password: {admin.hashed_password}")
            
            # Check if "admin123" matches
            is_valid = verify_password("admin123", admin.hashed_password)
            print(f"Is 'admin123' valid? {is_valid}")
            
            if not is_valid:
                print("Updating password to 'admin123'...")
                admin.hashed_password = get_password_hash("admin123")
                await db.commit()
                print("Update complete!")
        else:
            print("Admin user NOT FOUND!")

if __name__ == "__main__":
    asyncio.run(test_auth())
