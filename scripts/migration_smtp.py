import sys
import os

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Asegurar que se puede importar 'backend' si se ejecuta desde el directorio padre
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from backend.database import engine

def migrate():
    print("Iniciando migración de configuración SMTP...")
    statements = [
        "ALTER TABLE system_config ADD COLUMN IF NOT EXISTS smtp_host VARCHAR(100) DEFAULT 'smtp.gmail.com';",
        "ALTER TABLE system_config ADD COLUMN IF NOT EXISTS smtp_port INTEGER DEFAULT 587;",
        "ALTER TABLE system_config ADD COLUMN IF NOT EXISTS smtp_username VARCHAR(150);",
        "ALTER TABLE system_config ADD COLUMN IF NOT EXISTS smtp_password VARCHAR(255);",
        "ALTER TABLE system_config ADD COLUMN IF NOT EXISTS smtp_use_tls BOOLEAN DEFAULT TRUE;",
        "ALTER TABLE system_config ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE system_config ADD COLUMN IF NOT EXISTS email_alerts_recipients VARCHAR(500);"
    ]
    with engine.begin() as conn:
        for stmt in statements:
            try:
                conn.execute(text(stmt))
                print(f"Ejecutado con éxito.")
            except Exception as e:
                print(f"Error al ejecutar sentencia: {e}")
    print("✅ Migración SMTP finalizada con éxito.")
    return True

if __name__ == "__main__":
    migrate()
