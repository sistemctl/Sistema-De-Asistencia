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
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

DATABASE_URL = (
    f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

# ── Seguridad / JWT ───────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "hikvision-asistencia-secret-key-2026-cambiar-en-produccion")
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
CORS_ORIGINS = ["*"]  # En producción, restringir a la IP del servidor

# ── Aplicación ────────────────────────────────────────────────────────────────
APP_NAME    = "Sistema de Asistencia — Hikvision DS-K1T323MBWX"
APP_VERSION = "1.0.0"
TIMEZONE    = os.getenv("TIMEZONE", "America/Bogota")
