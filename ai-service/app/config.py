from pydantic_settings import BaseSettings  # type: ignore
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # OpenRouter API
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_model: str = "google/gemini-2.0-flash-001"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True

    # Processing
    max_image_size: int = 1024  # Max dimension in pixels for resizing

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
