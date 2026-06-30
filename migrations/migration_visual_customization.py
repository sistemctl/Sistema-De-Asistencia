from backend.database import SessionLocal
from sqlalchemy import text

def run_migration():
    db = SessionLocal()
    try:
        # Añadir columnas si no existen
        db.execute(text("ALTER TABLE system_config ADD COLUMN IF NOT EXISTS theme_preset VARCHAR(50) DEFAULT 'default';"))
        db.execute(text("ALTER TABLE system_config ADD COLUMN IF NOT EXISTS card_style VARCHAR(50) DEFAULT 'glass';"))
        db.execute(text("ALTER TABLE system_config ADD COLUMN IF NOT EXISTS enable_mesh_bg BOOLEAN DEFAULT TRUE;"))
        db.commit()
        print("Columnas de personalización visual añadidas correctamente a system_config.")
    except Exception as e:
        db.rollback()
        print(f"Aviso en migración de apariencia: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
