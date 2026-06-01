from backend.database import SessionLocal
from sqlalchemy import text

def run_migration():
    db = SessionLocal()
    try:
        db.execute(text("ALTER TABLE system_config ADD COLUMN bg_base_color VARCHAR(30) DEFAULT '#f8fafc';"))
        db.execute(text("ALTER TABLE system_config ADD COLUMN bg_surface_color VARCHAR(30) DEFAULT '#ffffff';"))
        db.commit()
        print("Columnas de fondo añadidas correctamente a system_config.")
    except Exception as e:
        db.rollback()
        print(f"Aviso: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
