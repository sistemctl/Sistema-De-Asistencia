from sqlalchemy import text
import sys
import os

# Add root folder to sys.path to resolve 'backend' module
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.database import SessionLocal

def add_columns():
    db = SessionLocal()
    try:
        db.execute(text("ALTER TABLE system_config ADD COLUMN flexible_shift_enable BOOLEAN DEFAULT true"))
        db.execute(text("ALTER TABLE system_config ADD COLUMN tolerance_enable BOOLEAN DEFAULT true"))
        db.commit()
        print("Columns 'flexible_shift_enable' and 'tolerance_enable' added successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    add_columns()
