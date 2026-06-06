from backend.database import SessionLocal
from sqlalchemy import text

def fix_schema():
    db = SessionLocal()
    
    # Tables that need created_at and updated_at
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
    
    print("Iniciando verificación y corrección de columnas de auditoría...")
    for table in tables:
        try:
            # Add created_at if it does not exist
            db.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();"))
            # Add updated_at if it does not exist
            db.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW();"))
            db.commit()
            print(f"Table '{table}': columns verified.")
        except Exception as e:
            db.rollback()
            print(f"Error in table '{table}': {e}")
            
    db.close()
    print("Finalizado.")

if __name__ == "__main__":
    fix_schema()
