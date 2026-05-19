from datetime import datetime
from zoneinfo import ZoneInfo
from backend.config import TIMEZONE

def get_local_now():
    """Retorna el datetime actual en la zona horaria configurada (con zona horaria)."""
    return datetime.now(ZoneInfo(TIMEZONE))

def to_local_datetime(dt: datetime):
    """Convierte un datetime (aware o naive) a la zona horaria local."""
    if dt.tzinfo:
        return dt.astimezone(ZoneInfo(TIMEZONE))
    # Si es naive, asumimos que viene en UTC (común en dispositivos) y lo pasamos a local
    return dt.replace(tzinfo=ZoneInfo("UTC")).astimezone(ZoneInfo(TIMEZONE))
