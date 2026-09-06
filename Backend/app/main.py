from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.seed import seed_database
from app.services.scheduler import start_scheduler, shutdown_scheduler

# Import routers
from app.routers import (
    auth, config_rules, products, warehouses, quotations,
    approvals, fulfillment, billing, portal, deal_health, reports, ws, chat
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist + seed data loaded.
    # Zero-config dev convenience (SQLite): create_all() so `uvicorn app.main:app`
    # just works with no extra step. In production, schema is owned by Alembic
    # (`alembic upgrade head` as a deploy step) - skip the implicit create_all
    # so the app can never silently diverge from the migration history.
    if settings.ENVIRONMENT != "production":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    await seed_database()
    start_scheduler()
    yield
    # Shutdown
    shutdown_scheduler()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Self-governing sales operations platform backend.",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(config_rules.router, prefix=settings.API_V1_STR)
app.include_router(products.router, prefix=settings.API_V1_STR)
app.include_router(warehouses.router, prefix=settings.API_V1_STR)
app.include_router(quotations.router, prefix=settings.API_V1_STR)
app.include_router(approvals.router, prefix=settings.API_V1_STR)
app.include_router(fulfillment.router, prefix=settings.API_V1_STR)
app.include_router(billing.router, prefix=settings.API_V1_STR)
app.include_router(portal.router, prefix=settings.API_V1_STR)
app.include_router(deal_health.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(ws.router, prefix=settings.API_V1_STR)
app.include_router(chat.router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "status": "online"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
