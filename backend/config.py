"""
Configuración centralizada del Sistema de Asistencia.
Todos los parámetros editables desde aquí o desde variables de entorno (.env).
"""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ── Rutas base ────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads" / "faces"
FRONTEND_DIR = BASE_DIR / "frontend"

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# ── Base de datos PostgreSQL ──────────────────────────────────────────────────
DB_HOST     = os.getenv("DB_HOST", "localhost")
DB_PORT     = os.getenv("DB_PORT", "5432")
DB_NAME     = os.getenv("DB_NAME", "asistencia")
DB_USER     = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
if not DB_PASSWORD:
    import logging as _logging
    _logging.getLogger(__name__).warning("⚠️ DB_PASSWORD no configurada en .env — la conexión a PostgreSQL puede fallar.")

DATABASE_URL = (
    f"postgresql+psycopg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

# ── Seguridad / JWT ───────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    import secrets as _secrets
    SECRET_KEY = _secrets.token_hex(32)
    import warnings as _warnings
    _warnings.warn(
        "⚠️ SECRET_KEY no configurada en .env — usando clave temporal. "
        "Configure SECRET_KEY en producción.",
        stacklevel=2,
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 8  # Jornada laboral

# ── Credenciales admin por defecto (primer arranque) ─────────────────────────
DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_PASSWORD = "admin123"

# ── Dispositivo Hikvision ─────────────────────────────────────────────────────
DEVICE_IP       = os.getenv("DEVICE_IP", "192.168.4.137")
DEVICE_PORT     = int(os.getenv("DEVICE_PORT", "80"))
DEVICE_USERNAME = os.getenv("DEVICE_USERNAME", "admin")
DEVICE_PASSWORD = os.getenv("DEVICE_PASSWORD", "admin123")
DEVICE_TIMEOUT  = 10  # segundos

# ── Scheduler ─────────────────────────────────────────────────────────────────
SYNC_INTERVAL_MINUTES = 5    # Cada cuántos minutos sincronizar
SYNC_MAX_EVENTS       = 1000 # Máximo de eventos por sincronización

# ── CORS ──────────────────────────────────────────────────────────────────────
# En producción, configure CORS_ORIGINS en .env como lista separada por comas
# Ejemplo: CORS_ORIGINS=https://mi-dominio.com,https://admin.mi-dominio.com
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")

# ── Aplicación ────────────────────────────────────────────────────────────────
APP_NAME    = "Sistema de Asistencia — Hikvision DS-K1T323MBWX"
APP_VERSION = "1.9.0"
TIMEZONE    = os.getenv("TIMEZONE", "America/Bogota")
