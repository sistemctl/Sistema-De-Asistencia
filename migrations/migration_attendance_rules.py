from backend.database import SessionLocal
from sqlalchemy import text

def run_migration():
    print("Iniciando migración de base de datos para reglas de asistencia avanzadas en system_config...")
    db = SessionLocal()
    try:
        columns = [
            ("exit_tolerance_minutes", "INTEGER DEFAULT 10"),
            ("require_checkin", "BOOLEAN DEFAULT TRUE"),
            ("require_checkout", "BOOLEAN DEFAULT TRUE"),
            ("mark_late_enable", "BOOLEAN DEFAULT TRUE"),
            ("mark_late_limit_minutes", "INTEGER DEFAULT 0"),
            ("mark_absent_if_late_enable", "BOOLEAN DEFAULT FALSE"),
            ("mark_absent_if_late_limit_minutes", "INTEGER DEFAULT 60"),
            ("mark_early_departure_enable", "BOOLEAN DEFAULT TRUE"),
            ("mark_early_departure_limit_minutes", "INTEGER DEFAULT 0"),
            ("mark_absent_if_early_checkout_enable", "BOOLEAN DEFAULT FALSE"),
            ("mark_absent_if_early_checkout_limit_minutes", "INTEGER DEFAULT 60"),
            ("no_checkin_enable", "BOOLEAN DEFAULT TRUE"),
            ("no_checkin_status", "VARCHAR(20) DEFAULT 'Absent'"),
            ("no_checkout_enable", "BOOLEAN DEFAULT TRUE"),
            ("no_checkout_status", "VARCHAR(20) DEFAULT 'Absent'"),
            ("flexible_shift_start", "VARCHAR(10) DEFAULT '09:00:00'"),
            ("flexible_shift_end", "VARCHAR(10) DEFAULT '18:00:00'")
        ]
        
        for col_name, col_type in columns:
            sql = f"ALTER TABLE system_config ADD COLUMN IF NOT EXISTS {col_name} {col_type};"
            db.execute(text(sql))
            
        db.commit()
        print("Columnas de reglas de asistencia agregadas o verificadas con éxito en la tabla 'system_config'.")
        print("Migración completada con éxito.")
    except Exception as e:
        db.rollback()
        print(f"Error durante la migración: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
