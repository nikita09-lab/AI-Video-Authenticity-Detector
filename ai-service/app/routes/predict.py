"""Prediction routes for the AI microservice."""

from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException  # type: ignore
from app.models.schemas import PredictRequest, PredictResponse  # type: ignore
from app.models.detector import analyze_frame  # type: ignore

router = APIRouter()


@router.post("/predict", response_model=PredictResponse)
async def predict_single(request: PredictRequest) -> PredictResponse:
    """Analyze a single video frame for AI generation indicators."""
    if not request.image:
        raise HTTPException(status_code=400, detail="No image data provided.")

    result = await analyze_frame(request.image, request.filename or "frame.jpg")

    return PredictResponse(
        real_probability=result["real_probability"],
        fake_probability=result["fake_probability"],
        confidence=result["confidence"],
        explanation=result["explanation"],
        model_version=result.get("model_version", "unknown"),
    )


@router.post("/predict/batch")
async def predict_batch(frames: List[PredictRequest]) -> List[Dict[str, Any]]:
    """Analyze multiple frames in a batch."""
    if not frames:
        raise HTTPException(status_code=400, detail="No frames provided.")

    if len(frames) > 60:
        raise HTTPException(status_code=400, detail="Maximum 60 frames per batch.")

    results = []
    for frame in frames:
        result = await analyze_frame(frame.image, frame.filename or "frame.jpg")
        results.append(result)

    return results
