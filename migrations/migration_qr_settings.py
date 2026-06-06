from backend.database import SessionLocal
from sqlalchemy import text

def run_migration():
    db = SessionLocal()
    try:
        db.execute(text("ALTER TABLE system_config ADD COLUMN qr_badge_show_blood_type BOOLEAN DEFAULT TRUE;"))
        db.execute(text("ALTER TABLE system_config ADD COLUMN qr_badge_show_department BOOLEAN DEFAULT TRUE;"))
        db.execute(text("ALTER TABLE system_config ADD COLUMN mobile_qr_portal_enabled BOOLEAN DEFAULT FALSE;"))
        db.commit()
        print("Columnas de configuración QR añadidas correctamente a system_config.")
    except Exception as e:
        db.rollback()
        print(f"Aviso: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
