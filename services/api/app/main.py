import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from app.core.middleware import security_middleware, BodyLimitMiddleware
from app.config import settings
from app.database import engine, Base
from app.routers import (
    auth,
    shops,
    themes,
    products,
    categories,
    orders,
    public,
    subscriptions,
    domains,
    admin,
    operations
)
from app.seeds.seed_data import seed_all

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables and seed data exist
    if settings.AUTO_CREATE_TABLES:
        Base.metadata.create_all(bind=engine)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    if settings.SEED_DEMO_DATA:
        seed_all(demo=True)
    yield

app = FastAPI(
    title=settings.APP_NAME,
    description="Multi-Tenant E-Commerce SaaS API for Arise Store Platform",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.APP_ENV != "production" else None,
    redoc_url=None,
)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
app.middleware("http")(security_middleware)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.ALLOWED_HOSTS)
app.add_middleware(BodyLimitMiddleware)

@app.exception_handler(IntegrityError)
async def conflict_handler(request, exc):
    return JSONResponse({"detail": "This request conflicts with an existing record. Refresh and try again."}, status_code=409)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for uploads
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Routers under /api/v1
app.include_router(auth.router, prefix="/api/v1")
app.include_router(shops.router, prefix="/api/v1")
app.include_router(themes.router, prefix="/api/v1")
app.include_router(products.router, prefix="/api/v1")
app.include_router(categories.router, prefix="/api/v1")
app.include_router(orders.router, prefix="/api/v1")
app.include_router(public.router, prefix="/api/v1")
app.include_router(subscriptions.router, prefix="/api/v1")
app.include_router(domains.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(operations.router, prefix="/api/v1")

@app.get("/health")
def health_check():
    return {"status": "healthy", "platform": settings.APP_NAME, "env": settings.APP_ENV}

@app.get("/ready")
def readiness():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1 FROM users LIMIT 1"))
        if settings.REDIS_URL:
            import redis
            redis.Redis.from_url(settings.REDIS_URL, socket_connect_timeout=2, socket_timeout=2).ping()
    except Exception:
        return JSONResponse({"status": "unavailable"}, status_code=503)
    return {"status": "ready"}

