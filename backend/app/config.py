import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()


def _db_url():
    url = os.getenv("DATABASE_URL", "sqlite:///laim_dev.db")
    return url.replace("postgres://", "postgresql://", 1)


def _secret(name, fallback):
    value = os.getenv(name, "")
    if os.getenv("RENDER") and len(value) < 16:
        raise RuntimeError(f"{name} must be set to a long random value in production.")
    return value or fallback


class Config:
    SECRET_KEY = _secret("SECRET_KEY", "dev-only-secret")
    MAX_CONTENT_LENGTH = 1024 * 1024
    SQLALCHEMY_DATABASE_URI = _db_url()
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}
    JSON_SORT_KEYS = False

    JWT_SECRET_KEY = _secret("JWT_SECRET_KEY", "dev-only-jwt-secret-for-local-use-only")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=30)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)

    RATELIMIT_STORAGE_URI = os.getenv("RATELIMIT_STORAGE_URI", "memory://")
    RATELIMIT_HEADERS_ENABLED = True

    CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
    FRONTEND_DIST = os.getenv("FRONTEND_DIST", "")
    BUILDING_FUND_TARGET = int(os.getenv("BUILDING_FUND_TARGET", "0") or 0)
    TRUST_PROXY = os.getenv("TRUST_PROXY", "") == "1"


class TestConfig(Config):
    TESTING = True
    JWT_SECRET_KEY = "test-only-jwt-secret-that-is-long-enough-123"
    SQLALCHEMY_DATABASE_URI = "sqlite://"
    RATELIMIT_ENABLED = False
    RATELIMIT_STORAGE_URI = "memory://"
