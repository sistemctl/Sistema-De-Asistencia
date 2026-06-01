from backend.database import SessionLocal
from sqlalchemy import text

def run_migration():
    print("Iniciando migracion de base de datos para dias de la semana en horarios...")
    db = SessionLocal()
    try:
        # Agregar columna work_days a la tabla schedules si no existe
        db.execute(text("ALTER TABLE schedules ADD COLUMN IF NOT EXISTS work_days VARCHAR(100) DEFAULT '1,2,3,4,5' NOT NULL;"))
        db.commit()
        print("Columna work_days agregada o verificada con exito en la tabla 'schedules'.")
        print("Migracion completada con exito.")
    except Exception as e:
        db.rollback()
        print(f"Error durante la migracion: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
