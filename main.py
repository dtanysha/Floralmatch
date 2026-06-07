import sys
from pathlib import Path

# backend/ содержит пакет app — добавляем в sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent / "backend"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import text

from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.products import router as products_router
from app.api.admin import router as admin_router
from app.api.cart import router as cart_router
from app.api.orders import router as orders_router
from app.api.favorites import router as favorites_router
from app.api.constructor import router as constructor_router
from app.core.config import settings
from app.core.logging_config import setup_logging
from app.db.database import engine

setup_logging()

app = FastAPI(
    title="FloralMatch API",
    description="API для цветочного магазина с конструктором букетов",
    version="1.0.0",
)

# CORS
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(products_router)
app.include_router(admin_router)
app.include_router(cart_router)
app.include_router(orders_router)
app.include_router(favorites_router)
app.include_router(constructor_router)


@app.get("/health")
def health():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "database": str(e)}


# Раздача статики фронтенда (собранный Vite билд)
frontend_dist = Path(__file__).resolve().parent / "frontend" / "dist"
frontend_public = Path(__file__).resolve().parent / "frontend" / "public"

if frontend_public.exists():
    app.mount("/bouquets", StaticFiles(directory=frontend_public / "bouquets"), name="bouquets")
    app.mount("/flowers", StaticFiles(directory=frontend_public / "flowers"), name="flowers")
    app.mount("/hero", StaticFiles(directory=frontend_public / "hero"), name="hero")
    uploads_dir = frontend_public / "uploads"
    uploads_dir.mkdir(exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="assets")

    @app.get("/{path:path}")
    def serve_spa(path: str):
        file_path = frontend_dist / path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_dist / "index.html")
