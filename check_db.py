import asyncio
import sys
import os

# Ensure we can find the app package
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(current_dir, "backend")
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

# Manually set vars if not env
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:1234@localhost:5432/ocap_db"

from sqlalchemy import inspect
from app.db.session import engine

async def check_db():
    try:
        async with engine.connect() as conn:
            tables = await conn.run_sync(lambda sync_conn: inspect(sync_conn).get_table_names())
            print(f"Tables: {tables}")
            
            if "projects" in tables:
                res = await conn.execute("SELECT COUNT(*) FROM projects")
                count = res.scalar()
                print(f"Project count: {count}")
            else:
                print("projects table MISSING!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_db())
