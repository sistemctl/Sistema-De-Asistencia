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
from backend.database import engine, SessionLocal
from backend.models import AuditLog

def migrate():
    print("Iniciando migración para la tabla 'audit_logs'...")
    try:
        # Crea la tabla si no existe
        AuditLog.__table__.create(engine, checkfirst=True)
        print("✅ Tabla 'audit_logs' creada/verificada exitosamente.")
    except Exception as e:
        print(f"❌ Error al crear la tabla 'audit_logs': {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = migrate()
    if not success:
        sys.exit(1)
