import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from app.core.config import settings
from app.core.database import init_db
from app.api.v1.router import api_router

# Configure Logging
logging.basicConfig(
    level=logging.INFO if settings.DEBUG else logging.WARNING,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("travelbot")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup & shutdown events."""
    logger.info("Initializing AI Travel Assistant database...")
    await init_db()
    logger.info("Application startup complete.")
    yield
    logger.info("Shutting down AI Travel Assistant...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AI-Powered WhatsApp Travel Bot (FastAPI + LangGraph + Live Flight Search + Direct PNR Confirmation)",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include unified API router (supports both /api and /api/v1 prefixes)
app.include_router(api_router, prefix=settings.API_V1_PREFIX)
if settings.API_V1_PREFIX != "/api/v1":
    app.include_router(api_router, prefix="/api/v1")


@app.get("/", tags=["System"])
async def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "simulator": "/simulator",
        "endpoints": {
            "ai_chat": f"{settings.API_V1_PREFIX}/ai/chat",
            "whatsapp_webhook": f"{settings.API_V1_PREFIX}/ai/webhook/whatsapp",
            "flights_search": f"{settings.API_V1_PREFIX}/flights/search",
            "bookings": f"{settings.API_V1_PREFIX}/bookings",
        },
    }


@app.get("/simulator", response_class=HTMLResponse, tags=["Simulator"])
async def whatsapp_simulator():
    """Clean, dedicated WhatsApp Chat interface for interacting with the AI Travel Assistant."""
    template_path = os.path.join(os.path.dirname(__file__), "templates", "whatsapp_chat.html")
    with open(template_path, "r", encoding="utf-8") as f:
        html_content = f.read()
    return HTMLResponse(content=html_content)


