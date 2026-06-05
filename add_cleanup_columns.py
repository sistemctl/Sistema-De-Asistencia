from sqlalchemy import text
from backend.database import SessionLocal

def add_columns():
    db = SessionLocal()
    try:
        db.execute(text("ALTER TABLE system_config ADD COLUMN IF NOT EXISTS cleanup_enabled BOOLEAN DEFAULT false"))
        db.execute(text("ALTER TABLE system_config ADD COLUMN IF NOT EXISTS cleanup_time VARCHAR(10) DEFAULT '02:00'"))
        
        db.execute(text("ALTER TABLE system_config ADD COLUMN IF NOT EXISTS retention_attendance_days INTEGER DEFAULT 1825"))
        db.execute(text("ALTER TABLE system_config ADD COLUMN IF NOT EXISTS retention_audit_logs_days INTEGER DEFAULT 365"))
        db.execute(text("ALTER TABLE system_config ADD COLUMN IF NOT EXISTS retention_sync_logs_days INTEGER DEFAULT 30"))
        
        # Opcionales para habilitar por separado
        db.execute(text("ALTER TABLE system_config ADD COLUMN IF NOT EXISTS cleanup_attendance_enabled BOOLEAN DEFAULT true"))
        db.execute(text("ALTER TABLE system_config ADD COLUMN IF NOT EXISTS cleanup_audit_enabled BOOLEAN DEFAULT true"))
        db.execute(text("ALTER TABLE system_config ADD COLUMN IF NOT EXISTS cleanup_sync_enabled BOOLEAN DEFAULT true"))
        
        db.commit()
        print("Columnas de mantenimiento añadidas exitosamente.")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    add_columns()
