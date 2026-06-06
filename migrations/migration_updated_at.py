from backend.database import SessionLocal
from sqlalchemy import text

def run_migration():
    db = SessionLocal()
    tables = [
        "departments",
        "positions",
        "schedules",
        "employees",
        "employee_leaves",
        "holidays",
        "users",
        "system_config"
    ]
    for table in tables:
        try:
            db.execute(text(f"ALTER TABLE {table} ADD COLUMN updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();"))
            db.commit()
            print(f"Columna updated_at añadida a la tabla {table}.")
        except Exception as e:
            db.rollback()
            print(f"Aviso en tabla {table}: {e}")
    db.close()

if __name__ == "__main__":
    run_migration()
