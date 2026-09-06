import os
import warnings
from pydantic_settings import BaseSettings, SettingsConfigDict

_INSECURE_DEFAULT_SECRET = "dealflow360_super_secret_jwt_key_2026"

class Settings(BaseSettings):
    PROJECT_NAME: str = "DealFlow360"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    SECRET_KEY: str = os.getenv("SECRET_KEY", _INSECURE_DEFAULT_SECRET)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    PORTAL_TOKEN_EXPIRE_DAYS: int = 7

    # DB URL - defaults to SQLite for immediate local execution, overridden by env var for PostgreSQL
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./dealflow360.db")

    # Comma-separated allow-list, e.g. "https://app.dealflow360.com,https://portal.dealflow360.com"
    # Defaults to local dev origins only - NEVER "*" with allow_credentials=True in production.
    CORS_ORIGINS: list[str] = [
        o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",") if o.strip()
    ]

    # Stalled quote threshold in days (default)
    STALLED_DEAL_DAYS: int = 7
    # Anomaly threshold multiplier (e.g. 1.5x rep trailing avg)
    ANOMALY_MULTIPLIER: float = 1.4

    # Chatbot & Gemini Flash Configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    CHAT_TOP_K: int = int(os.getenv("CHAT_TOP_K", "3"))
    CHAT_MIN_RELEVANCE: float = float(os.getenv("CHAT_MIN_RELEVANCE", "0.70"))
    CHAT_MAX_CONTEXT_CHARS: int = int(os.getenv("CHAT_MAX_CONTEXT_CHARS", "4000"))
    CHAT_MAX_HISTORY: int = int(os.getenv("CHAT_MAX_HISTORY", "6"))
    CHAT_MAX_OUTPUT_TOKENS: int = int(os.getenv("CHAT_MAX_OUTPUT_TOKENS", "800"))
    CHAT_RATE_LIMIT: int = int(os.getenv("CHAT_RATE_LIMIT", "30"))

    model_config = SettingsConfigDict(case_sensitive=True)

settings = Settings()

# Fail loud, not silent: never let the placeholder JWT secret reach a real deploy.
if settings.ENVIRONMENT == "production" and settings.SECRET_KEY == _INSECURE_DEFAULT_SECRET:
    raise RuntimeError(
        "SECRET_KEY env var is unset (or still the committed placeholder) while "
        "ENVIRONMENT=production. Set a real, unique SECRET_KEY before starting."
    )
elif settings.SECRET_KEY == _INSECURE_DEFAULT_SECRET:
    warnings.warn(
        "Using the default placeholder SECRET_KEY - fine for local dev, "
        "never for a real deployment. Set the SECRET_KEY env var.",
        stacklevel=2,
    )
