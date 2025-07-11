import os
from typing import Optional, Literal
from pydantic_settings import BaseSettings
from pydantic import Field, validator
import secrets


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "School Nexus"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = False
    
    # Security
    SECRET_KEY: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    JWT_SECRET_KEY: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # Database Configuration
    DATABASE_TYPE: Literal["supabase", "postgresql", "mysql", "mongodb"] = "mongodb"
    
    # MongoDB (legacy support)
    MONGO_URL: Optional[str] = None
    MONGO_DB_NAME: str = "school_nexus"
    
    # PostgreSQL
    POSTGRES_HOST: Optional[str] = None
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: Optional[str] = None
    POSTGRES_PASSWORD: Optional[str] = None
    POSTGRES_DB: str = "school_nexus"
    
    # MySQL
    MYSQL_HOST: Optional[str] = None
    MYSQL_PORT: int = 3306
    MYSQL_USER: Optional[str] = None
    MYSQL_PASSWORD: Optional[str] = None
    MYSQL_DB: str = "school_nexus"
    
    # Supabase
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None
    SUPABASE_SERVICE_KEY: Optional[str] = None
    
    # AI Configuration
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    AI_PROVIDER: Literal["openai", "anthropic"] = "openai"
    AI_MODEL: str = "gpt-4"
    ENABLE_AI_FEATURES: bool = True
    
    # Voice Processing
    ENABLE_VOICE_FEATURES: bool = True
    WHISPER_API_KEY: Optional[str] = None
    
    # File Storage
    STORAGE_TYPE: Literal["local", "s3", "minio", "cloudinary"] = "local"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_BUCKET_NAME: Optional[str] = None
    AWS_REGION: str = "us-east-1"
    
    MINIO_ENDPOINT: Optional[str] = None
    MINIO_ACCESS_KEY: Optional[str] = None
    MINIO_SECRET_KEY: Optional[str] = None
    MINIO_BUCKET_NAME: str = "school-nexus"
    
    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None
    
    # Email Configuration
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_TLS: bool = True
    FROM_EMAIL: str = "noreply@schoolnexus.com"
    
    # Telegram Bot
    TELEGRAM_BOT_TOKEN: Optional[str] = None
    TELEGRAM_WEBHOOK_URL: Optional[str] = None
    
    # WhatsApp (Twilio)
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_WHATSAPP_NUMBER: Optional[str] = None
    
    # Redis (Caching & Sessions)
    REDIS_URL: Optional[str] = "redis://localhost:6379"
    REDIS_TTL: int = 3600
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: Optional[str] = None
    ENABLE_DB_LOGS: bool = False
    
    # Monitoring
    SENTRY_DSN: Optional[str] = None
    ENABLE_METRICS: bool = True
    METRICS_PORT: int = 9090
    
    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:3001"]
    
    # First Run Setup
    SETUP_COMPLETED: bool = False
    SUPER_ADMIN_EMAIL: str = "admin@schoolnexus.com"
    SUPER_ADMIN_PASSWORD: str = "admin123"
    
    @validator("CORS_ORIGINS", pre=True)
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    @property
    def database_url(self) -> str:
        """Generate database URL based on configuration"""
        if self.DATABASE_TYPE == "postgresql":
            return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        elif self.DATABASE_TYPE == "mysql":
            return f"mysql+aiomysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DB}"
        elif self.DATABASE_TYPE == "mongodb":
            return self.MONGO_URL
        elif self.DATABASE_TYPE == "supabase":
            # Supabase uses PostgreSQL under the hood
            if self.SUPABASE_URL:
                # Extract connection details from Supabase URL
                return self.SUPABASE_URL.replace("https://", "postgresql+asyncpg://postgres:")
        return ""
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Dependency to get settings"""
    return settings


# Database connection strings for different environments
DATABASE_URLS = {
    "development": {
        "postgresql": "postgresql+asyncpg://postgres:password@localhost:5432/school_nexus_dev",
        "mysql": "mysql+aiomysql://root:password@localhost:3306/school_nexus_dev",
        "mongodb": "mongodb://localhost:27017/school_nexus_dev"
    },
    "production": {
        "postgresql": settings.database_url,
        "mysql": settings.database_url,
        "mongodb": settings.database_url
    }
}