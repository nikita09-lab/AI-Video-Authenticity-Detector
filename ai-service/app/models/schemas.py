from pydantic import BaseModel  # type: ignore
from typing import Optional


class PredictRequest(BaseModel):
    """Request body for single frame prediction."""
    image: str  # base64 encoded image
    filename: Optional[str] = "frame.jpg"


class PredictResponse(BaseModel):
    """Response body for a single frame prediction."""
    real_probability: float
    fake_probability: float
    confidence: float
    explanation: str
    model_version: str


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    model_loaded: bool
    model_name: str
