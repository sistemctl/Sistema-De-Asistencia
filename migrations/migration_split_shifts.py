from backend.database import SessionLocal
from sqlalchemy import text

def run_migration():
    print("🚀 Iniciando migración de base de datos para Jornada Partida / Horario Cortado...")
    db = SessionLocal()
    try:
        # Agregar columnas a la tabla schedules
        db.execute(text("ALTER TABLE schedules ADD COLUMN IF NOT EXISTS shift_type VARCHAR(30) DEFAULT 'continuous' NOT NULL;"))
        db.execute(text("ALTER TABLE schedules ADD COLUMN IF NOT EXISTS lunch_start_time VARCHAR(5) DEFAULT NULL;"))
        db.execute(text("ALTER TABLE schedules ADD COLUMN IF NOT EXISTS lunch_end_time VARCHAR(5) DEFAULT NULL;"))
        db.commit()
        print("✅ Columnas shift_type, lunch_start_time y lunch_end_time añadidas a 'schedules'.")
        print("🎉 Migración completada con éxito.")
    except Exception as e:
        db.rollback()
        print(f"❌ Error durante la migración: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
