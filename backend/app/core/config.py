from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )
    
    APP_NAME: str = "OCAP"
    DEBUG: bool = True
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 Days
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/ocap_db"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Clickhouse
    CLICKHOUSE_HOST: str = "localhost"
    CLICKHOUSE_PORT: int = 8123
    
    # Server configuration
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    
    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    FRONTEND_URL: str = "http://localhost:5173"

    # SMTP / Email
    MAIL_MAILER: str = "smtp"
    MAIL_HOST: str = "smtp.gmail.com"
    MAIL_PORT: int = 587
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_ENCRYPTION: str = "tls"
    MAIL_FROM_ADDRESS: str = "noreply@example.com"
    MAIL_FROM_NAME: str = "OCAP"

    # Bulk email tuning
    MAIL_RATE_LIMIT_DELAY: float = 0.1   # seconds between individual sends
    MAIL_MAX_RETRIES: int = 3             # retry attempts per failed send
    MAIL_RETRY_BACKOFF: float = 2.0       # multiplier for retry wait (2s, 4s, 8s)
    MAIL_CONNECTION_TIMEOUT: int = 30     # SMTP connect/login timeout in seconds

settings = Settings()
