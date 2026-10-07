import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application Info
    PROJECT_NAME: str = "AI Travel Assistant"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/travelbot"
    USE_SQLITE_FALLBACK: bool = True
    SQLITE_URL: str = "sqlite+aiosqlite:///./travelbot.db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # AI / LLM (OpenAI & Google Gemini)
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o"
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"

    # WhatsApp Cloud API
    WHATSAPP_PHONE_NUMBER_ID: Optional[str] = None
    WHATSAPP_ACCESS_TOKEN: Optional[str] = None
    WHATSAPP_VERIFY_TOKEN: str = "travelbot_secure_verify_token_2026"
    WHATSAPP_API_VERSION: str = "v20.0"
    WHATSAPP_MOCK_MODE: bool = True

    # Zoho Payments
    ZOHO_CLIENT_ID: Optional[str] = None
    ZOHO_CLIENT_SECRET: Optional[str] = None
    ZOHO_MERCHANT_ID: Optional[str] = None
    ZOHO_PAYMENT_URL: str = "https://payments.zoho.com/api/v1/paymentlinks"
    ZOHO_MOCK_MODE: bool = True

    # B2B Flight API (Uses configured access key)
    FLIGHT_API_KEY: Optional[str] = "2136600e825085-3cb6-4361-b5cf-910217fd6152"
    FLIGHT_API_BASE_URL: str = "https://tripjack.com"
    FLIGHT_API_TEST_BASE_URL: str = "https://apitest.tripjack.com"
    FLIGHT_API_USE_TEST_ENV: bool = False
    FLIGHT_API_MOCK_MODE: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
