import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data" / "development"
DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR = DATA_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class DevelopmentConfig:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret")
    JWT_VERIFY_SUB = False
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{(DATA_DIR / 'haishi.db').as_posix()}",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    WECHAT_APPID = os.getenv("WECHAT_APPID", "")
    WECHAT_SECRET = os.getenv("WECHAT_SECRET", "")
    WECHAT_MOCK_OPENID = os.getenv("WECHAT_MOCK_OPENID", "1") == "1"
    BOOTSTRAP_ADMIN_USER = os.getenv("BOOTSTRAP_ADMIN_USER", "admin")
    BOOTSTRAP_ADMIN_PASSWORD = os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "admin12345")
    UPLOAD_FOLDER = str(UPLOAD_DIR)
