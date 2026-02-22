"""
AI Video Authenticity Detector — AI Inference Microservice

FastAPI application that analyzes video frames for signs of AI generation.
Uses OpenRouter's vision models (MVP) or local PyTorch models (Phase 2).
"""

from typing import Dict, Any
from fastapi import FastAPI  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore

from app.config import get_settings  # type: ignore
from app.routes.predict import router as predict_router  # type: ignore
from app.routes.health import router as health_router  # type: ignore

settings = get_settings()

app = FastAPI(
    title="VidAuth AI Service",
    description="AI inference microservice for video authenticity detection",
    version="1.0.0",
)

# CORS — allow the backend to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(predict_router)
app.include_router(health_router)


@app.on_event("startup")
async def startup_event() -> None:
    """Run on application startup."""
    api_key = settings.openrouter_api_key
    if len(api_key) > 12:
        masked_key = api_key[0:8] + "..." + api_key[-4:]
    else:
        masked_key = "(not set)"

    print("")
    print("=" * 50)
    print("  VidAuth AI Inference Service")
    print("-" * 50)
    print("  Model:  {}".format(settings.openrouter_model))
    print("  Mode:   OpenRouter Cloud API")
    print("  Key:    {}".format(masked_key))
    print("  Port:   {}".format(settings.port))
    print("=" * 50)
    print("")


@app.get("/")
async def root() -> Dict[str, Any]:
    return {
        "service": "VidAuth AI Inference",
        "version": "1.0.0",
        "model": settings.openrouter_model,
    }
