import os
from typing import List
from pydantic import model_validator, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "Arise Website Builder"
    APP_ENV: str = "development"
    APP_DEBUG: bool = True
    SECRET_KEY: str = "arise_store_super_secret_dev_key_change_in_production_32bytes"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(60, ge=5, le=1440)
    SEED_DEMO_DATA: bool = False
    AUTO_CREATE_TABLES: bool = False
    REDIS_URL: str = ""
    COOKIE_SECURE: bool = False
    DOMAIN_ROUTING_ENABLED: bool = False
    
    # Database
    DATABASE_URL: str = "sqlite:///./arise_store.db"
    
    # Multi-tenancy & Domains
    PLATFORM_BASE_DOMAIN: str = "arisestore.com"
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]
    ALLOWED_HOSTS: List[str] = ["localhost", "127.0.0.1", "testserver"]
    
    # Uploads
    UPLOAD_DIR: str = "./uploads"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @model_validator(mode="after")
    def production_guards(self):
        if self.APP_ENV == "production":
            if len(self.SECRET_KEY) < 32 or any(s in self.SECRET_KEY.lower() for s in ("secret", "change", "arise_")):
                raise ValueError("Production requires a random SECRET_KEY of at least 32 characters")
            if self.APP_DEBUG or self.SEED_DEMO_DATA or self.AUTO_CREATE_TABLES or not self.COOKIE_SECURE:
                raise ValueError("Production requires debug/demo/schema creation disabled and secure cookies")
            if not self.DATABASE_URL.startswith("postgresql+psycopg://") or not self.REDIS_URL:
                raise ValueError("Production requires PostgreSQL (psycopg) and Redis")
            if not self.ALLOWED_ORIGINS or any(not o.startswith("https://") or "*" in o for o in self.ALLOWED_ORIGINS):
                raise ValueError("Production requires explicit HTTPS ALLOWED_ORIGINS")
            if "*" in self.ALLOWED_HOSTS:
                raise ValueError("Production requires explicit ALLOWED_HOSTS")
        return self

settings = Settings()
