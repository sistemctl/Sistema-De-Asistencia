from backend.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    db.execute(text("ALTER TABLE device_config ADD COLUMN entry_tolerance_minutes INTEGER DEFAULT 10;"))
    db.execute(text("ALTER TABLE device_config ADD COLUMN exit_tolerance_minutes INTEGER DEFAULT 10;"))
    db.commit()
    print("Columnas añadidas correctamente.")
except Exception as e:
    db.rollback()
    print(f"Aviso: {e}")
finally:
    db.close()
