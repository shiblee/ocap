from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.core.config import settings
from app.api import auth, settings as app_settings, contacts, campaigns, analytics, projects, ai, webhooks
from fastapi.middleware.cors import CORSMiddleware
from app.services.scheduler_service import run_scheduler
import asyncio

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    scheduler_task = asyncio.create_task(run_scheduler())
    yield
    # Shutdown
    scheduler_task.cancel()

app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
    lifespan=lifespan
)

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(app_settings.router, prefix="/api/v1")
app.include_router(contacts.router, prefix="/api/v1")
app.include_router(campaigns.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(projects.router, prefix="/api/v1")
app.include_router(ai.router, prefix="/api/v1")
app.include_router(webhooks.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": f"Welcome to {settings.APP_NAME} API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
