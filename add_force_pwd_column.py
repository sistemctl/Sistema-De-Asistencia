from sqlalchemy import text
from backend.database import SessionLocal

def add_columns():
    db = SessionLocal()
    try:
        db.execute(text("ALTER TABLE users ADD COLUMN force_password_change BOOLEAN DEFAULT false"))
        db.commit()
        print("Columna 'force_password_change' añadida exitosamente.")
    except Exception as e:
        db.rollback()
        print(f"Error: {e} (Puede que la columna ya exista o SQLite no soporte ADD COLUMN de esta forma, revisa el error)")
    finally:
        db.close()

if __name__ == "__main__":
    add_columns()
