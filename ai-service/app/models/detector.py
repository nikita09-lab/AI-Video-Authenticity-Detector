"""
AI Detector module using OpenRouter's vision models.

For MVP, we use a cloud-based vision LLM (via OpenRouter) to analyze
individual video frames for signs of AI generation.

In Phase 2, this will be replaced with a local PyTorch model
(XceptionNet / EfficientNet fine-tuned on FaceForensics++).
"""

import hashlib
import itertools
import json
import re
from typing import Any, Dict

import httpx  # type: ignore
from app.config import get_settings  # type: ignore

settings = get_settings()

# The prompt instructs the vision model to act as a deepfake detector
DETECTION_PROMPT = """You are an expert AI-generated media forensics analyst. Analyze this video frame and determine whether it is from a REAL video or an AI-GENERATED video.

Look for these specific indicators:

AI-GENERATED indicators:
- Unnatural skin textures or overly smooth skin
- Inconsistent lighting or shadows
- Warped or asymmetric facial features
- Blurred or distorted edges around hair, ears, or accessories
- Unusual eye reflections or irregular pupil shapes
- Teeth or mouth anomalies
- Unnatural background elements or repeating patterns
- Overly perfect or plastic-looking appearance
- Inconsistent resolution across image regions
- GAN artifacts (checkerboard patterns, grid-like artifacts)

REAL video indicators:
- Natural skin imperfections (pores, wrinkles, blemishes)
- Consistent lighting and shadows across the scene
- Natural motion blur where expected
- Realistic depth of field
- Natural background elements
- Consistent compression artifacts typical of real cameras

Respond ONLY with a valid JSON object in this exact format (no markdown, no extra text):
{"real_probability": 0.XX, "fake_probability": 0.XX, "confidence": 0.XX, "key_observations": "brief description of what you observed"}

The probabilities must sum to 1.0. Confidence ranges from 0.0 (uncertain) to 1.0 (certain).
"""


async def analyze_frame(image_base64: str, filename: str = "frame.jpg") -> Dict[str, Any]:  # noqa
    """
    Analyze a single frame using OpenRouter's vision model.

    Args:
        image_base64: Base64-encoded image data
        filename: Original filename for context

    Returns:
        dict with real_probability, fake_probability, confidence, explanation
    """
    if not settings.openrouter_api_key:
        # Fallback: return mock prediction if no API key
        return _mock_prediction(filename)

    # Determine image mime type
    mime_type = "image/jpeg"
    if filename.endswith(".png"):
        mime_type = "image/png"

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "{}/chat/completions".format(settings.openrouter_base_url),
                headers={
                    "Authorization": "Bearer {}".format(settings.openrouter_api_key),
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://vidauth-detector.local",
                    "X-Title": "AI Video Authenticity Detector",
                },
                json={
                    "model": settings.openrouter_model,
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": DETECTION_PROMPT},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": "data:{};base64,{}".format(mime_type, image_base64)
                                    },
                                },
                            ],
                        }
                    ],
                    "max_tokens": 300,
                    "temperature": 0.1,  # Low temperature for consistent results
                },
            )

            if response.status_code != 200:
                error_text = response.text
                print("OpenRouter API error ({}): {}".format(response.status_code, error_text))
                return _mock_prediction(filename)

            data = response.json()
            content = data["choices"][0]["message"]["content"].strip()

            # Parse the JSON response from the model
            result = _parse_model_response(content)
            result["model_version"] = "openrouter-{}".format(settings.openrouter_model)
            return result

    except Exception as e:
        print("Error analyzing frame {}: {}".format(filename, e))
        return _mock_prediction(filename)

    return _mock_prediction(filename)  # fallback (should not be reached)


def _parse_model_response(content: str) -> Dict[str, Any]:
    """Parse the JSON response from the vision model."""
    try:
        # Try to extract JSON from the response (model might wrap in markdown)
        json_match = re.search(r'\{[^}]+\}', content, re.DOTALL)
        if json_match:
            parsed = json.loads(json_match.group())
        else:
            parsed = json.loads(content)

        real_prob = float(parsed.get("real_probability", 0.5))
        fake_prob = float(parsed.get("fake_probability", 0.5))
        confidence_val = float(parsed.get("confidence", 0.5))
        observations = str(parsed.get("key_observations", "Analysis completed."))

        # Normalize probabilities to sum to 1
        total = real_prob + fake_prob
        if total > 0:
            real_prob = real_prob / total
            fake_prob = fake_prob / total

        clamped_conf = min(max(confidence_val, 0.0), 1.0)

        return {
            "real_probability": float(int(real_prob * 10000) / 10000),
            "fake_probability": float(int(fake_prob * 10000) / 10000),
            "confidence": float(int(clamped_conf * 10000) / 10000),
            "explanation": observations,
        }

    except (json.JSONDecodeError, KeyError, ValueError) as e:
        truncated = content if len(content) <= 200 else "".join(itertools.islice(content, 200))
        print("Failed to parse model response: {} — Error: {}".format(truncated, e))
        return {
            "real_probability": 0.5,
            "fake_probability": 0.5,
            "confidence": 0.3,
            "explanation": "Could not parse model response reliably.",
        }


def _mock_prediction(filename: str) -> Dict[str, Any]:
    """
    Return a mock prediction when the API key is not set or API is unavailable.
    Uses filename hash for deterministic-ish results in demo mode.
    """
    hash_hex = hashlib.md5(filename.encode()).hexdigest()
    first_eight = "".join(itertools.islice(hash_hex, 8))
    hash_val = int(first_eight, 16)
    fake_prob = (hash_val % 100) / 100.0
    real_prob = 1.0 - fake_prob

    return {
        "real_probability": float(int(real_prob * 10000) / 10000),
        "fake_probability": float(int(fake_prob * 10000) / 10000),
        "confidence": 0.6,
        "explanation": "[DEMO MODE] Mock analysis of {}. Set OPENROUTER_API_KEY for real predictions.".format(filename),
        "model_version": "mock-v1",
    }
