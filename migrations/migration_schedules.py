from backend.database import SessionLocal
from sqlalchemy import text

def run_migration():
    print("🚀 Iniciando migración de base de datos para Horarios...")
    db = SessionLocal()
    try:
        # 1. Crear la tabla de schedules/horarios
        create_table_query = """
        CREATE TABLE IF NOT EXISTS schedules (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) UNIQUE NOT NULL,
            work_start_time VARCHAR(5) DEFAULT '07:00' NOT NULL,
            work_end_time VARCHAR(5) DEFAULT '18:00' NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        );
        """
        db.execute(text(create_table_query))
        print("✅ Tabla 'schedules' creada o verificada.")

        # 2. Agregar la columna schedule_id a employees
        add_column_query = """
        ALTER TABLE employees 
        ADD COLUMN IF NOT EXISTS schedule_id INTEGER REFERENCES schedules(id) ON DELETE SET NULL;
        """
        db.execute(text(add_column_query))
        print("✅ Columna 'schedule_id' añadida a 'employees'.")

        db.commit()
        print("🎉 Migración completada con éxito.")
    except Exception as e:
        db.rollback()
        print(f"❌ Error durante la migración: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
