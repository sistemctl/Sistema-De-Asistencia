from backend.database import SessionLocal
from sqlalchemy import text

def run_migration():
    db = SessionLocal()
    try:
        db.execute(text("ALTER TABLE device_config ADD COLUMN entry_tolerance_minutes INTEGER DEFAULT 10;"))
        db.execute(text("ALTER TABLE device_config ADD COLUMN exit_tolerance_minutes INTEGER DEFAULT 10;"))
        db.commit()
        print("Columnas de tolerancia añadidas correctamente a device_config.")
    except Exception as e:
        db.rollback()
        print(f"Aviso: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
