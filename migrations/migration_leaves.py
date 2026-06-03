from backend.database import SessionLocal
from sqlalchemy import text

def run_migration():
    print("Iniciando migración para crear la tabla 'employee_leaves'...")
    db = SessionLocal()
    try:
        # Create table
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS employee_leaves (
                id SERIAL PRIMARY KEY,
                employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                leave_type VARCHAR(50) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                description VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_employee_leaves_emp ON employee_leaves(employee_id);"))
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_employee_leaves_start ON employee_leaves(start_date);"))
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_employee_leaves_end ON employee_leaves(end_date);"))
        db.commit()
        print("Tabla 'employee_leaves' e índices creados con éxito.")
    except Exception as e:
        db.rollback()
        print(f"Error durante la migración de novedades: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
