from dataclasses import dataclass, field
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent  # project root


@dataclass
class Settings:
    APP_NAME: str = "N-ERP Workbench"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    API_PREFIX: str = "/api/v1"
    CORS_ORIGINS: list[str] = field(
        default_factory=lambda: ["http://localhost:5173"]
    )
    DATABASE_URL: str = f"sqlite+aiosqlite:///{BASE_DIR / 'dev.db'}"


settings = Settings()
