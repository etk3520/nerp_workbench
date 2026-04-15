import os
from dataclasses import dataclass, field


@dataclass
class Settings:
    APP_NAME: str = "N-ERP Workbench"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    API_PREFIX: str = "/api/v1"
    CORS_ORIGINS: list[str] = field(
        default_factory=lambda: os.getenv(
            "CORS_ORIGINS", "http://localhost:5173"
        ).split(",")
    )
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://nerp:nerp@localhost:5432/nerp",
    )


settings = Settings()
