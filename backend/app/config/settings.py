import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class BaseConfig:
    """Base configuration shared across all environments."""

    # ── App ────────────────────────────────────────────────────────────────
    SECRET_KEY              = os.getenv("SECRET_KEY", "dev-secret-key")
    PORT                    = int(os.getenv("PORT", 5000))

    # ── Society ────────────────────────────────────────────────────────────
    SOCIETY_NAME            = os.getenv("SOCIETY_NAME", "RM2 Residency")
    SOCIETY_CITY            = os.getenv("SOCIETY_CITY", "Bangalore")
    SOCIETY_CODE            = os.getenv("SOCIETY_CODE", "RM2")
    SOCIETY_ADDRESS         = os.getenv("SOCIETY_ADDRESS", "")
    SOCIETY_TIMEZONE        = os.getenv("SOCIETY_TIMEZONE", "Asia/Kolkata")
    SOCIETY_CURRENCY        = os.getenv("SOCIETY_CURRENCY", "INR")

    # ── Database ───────────────────────────────────────────────────────────
    SQLALCHEMY_DATABASE_URI         = os.getenv("DATABASE_URL", "sqlite:///rm2_vms.db")
    SQLALCHEMY_TRACK_MODIFICATIONS  = False
    SQLALCHEMY_ECHO                 = False

    # ── JWT ────────────────────────────────────────────────────────────────
    JWT_SECRET_KEY                  = os.getenv("JWT_SECRET_KEY", "jwt-dev-secret")
    JWT_ACCESS_TOKEN_EXPIRES        = timedelta(seconds=int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 86400)))
    JWT_REFRESH_TOKEN_EXPIRES       = timedelta(seconds=int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES", 2592000)))
    JWT_TOKEN_LOCATION              = ["headers"]
    JWT_HEADER_NAME                 = "Authorization"
    JWT_HEADER_TYPE                 = "Bearer"

    # ── Cloudinary ─────────────────────────────────────────────────────────
    CLOUDINARY_CLOUD_NAME           = os.getenv("CLOUDINARY_CLOUD_NAME")
    CLOUDINARY_API_KEY              = os.getenv("CLOUDINARY_API_KEY")
    CLOUDINARY_API_SECRET           = os.getenv("CLOUDINARY_API_SECRET")

    # ── Twilio ─────────────────────────────────────────────────────────────
    TWILIO_ACCOUNT_SID              = os.getenv("TWILIO_ACCOUNT_SID")
    TWILIO_AUTH_TOKEN               = os.getenv("TWILIO_AUTH_TOKEN")
    TWILIO_PHONE_NUMBER             = os.getenv("TWILIO_PHONE_NUMBER")

    # ── Firebase ───────────────────────────────────────────────────────────
    FIREBASE_CREDENTIALS_PATH       = os.getenv("FIREBASE_CREDENTIALS_PATH")

    # ── Redis ──────────────────────────────────────────────────────────────
    REDIS_URL                       = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # ── Rate Limiting ──────────────────────────────────────────────────────
    RATELIMIT_DEFAULT               = os.getenv("RATELIMIT_DEFAULT", "200 per day;50 per hour")
    RATELIMIT_STORAGE_URL           = os.getenv("REDIS_URL", "memory://")

    # ── Pagination ─────────────────────────────────────────────────────────
    DEFAULT_PAGE_SIZE               = 20
    MAX_PAGE_SIZE                   = 100

    # ── Shift timings ──────────────────────────────────────────────────────
    MORNING_SHIFT_START             = 8   # 8 AM
    MORNING_SHIFT_END               = 20  # 8 PM
    NIGHT_SHIFT_START               = 20  # 8 PM
    NIGHT_SHIFT_END                 = 8   # 8 AM next day

    # ── Overstay detection ─────────────────────────────────────────────────
    OVERSTAY_CHECK_INTERVAL_MINUTES = 15
    AUTO_CLOSE_AFTER_HOURS          = 24


class DevelopmentConfig(BaseConfig):
    DEBUG                           = True
    SQLALCHEMY_ECHO                 = True


class TestingConfig(BaseConfig):
    TESTING                         = True
    SQLALCHEMY_DATABASE_URI         = "sqlite:///:memory:"
    JWT_ACCESS_TOKEN_EXPIRES        = timedelta(minutes=5)


class ProductionConfig(BaseConfig):
    DEBUG                           = False
    SQLALCHEMY_ECHO                 = False


config_map = {
    "development": DevelopmentConfig,
    "testing":     TestingConfig,
    "production":  ProductionConfig,
}


def get_config():
    env = os.getenv("APP_ENV", "development")
    return config_map.get(env, DevelopmentConfig)
