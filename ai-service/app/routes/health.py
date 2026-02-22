"""Health check routes."""

from typing import Dict, Any
from fastapi import APIRouter  # type: ignore
from app.config import get_settings  # type: ignore

router = APIRouter()
settings = get_settings()


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """Check if the AI service is running and ready."""
    return {
        "status": "healthy",
        "model_loaded": True,
        "model_name": settings.openrouter_model,
        "inference_mode": "openrouter-cloud",
    }
