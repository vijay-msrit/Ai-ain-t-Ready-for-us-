"""FastAPI entry point for Fixora."""
# Main entry point: sets up FastAPI app, CORS, logging, and registers webhook/API routers.
# Updated: 2026-04-01
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.webhook import router as webhook_router

logging.basicConfig(
    level=settings.log_level,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("fixora")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Fixora starting up 🚀")
    yield
    logger.info("Fixora shutting down.")


app = FastAPI(
    title="Fixora",
    description="AI-Powered GitHub Issue Resolution Agent",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(webhook_router, prefix="/webhook", tags=["webhook"])


@app.get("/", tags=["health"])
async def root():
    return {"service": "Fixora", "status": "running"}


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=True,
    )
