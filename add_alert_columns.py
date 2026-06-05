from sqlalchemy import text
from backend.database import SessionLocal

def add_columns():
    db = SessionLocal()
    try:
        db.execute(text("ALTER TABLE system_config ADD COLUMN IF NOT EXISTS alert_device_offline BOOLEAN DEFAULT true"))
        db.execute(text("ALTER TABLE system_config ADD COLUMN IF NOT EXISTS alert_employee_lateness BOOLEAN DEFAULT true"))
        db.execute(text("ALTER TABLE system_config ADD COLUMN IF NOT EXISTS alert_admin_daily_report BOOLEAN DEFAULT true"))
        db.commit()
        print("Columnas añadidas exitosamente.")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    add_columns()
