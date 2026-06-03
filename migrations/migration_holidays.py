from backend.database import SessionLocal
from sqlalchemy import text
from datetime import date
import holidays

def run_migration():
    print("Iniciando migración para crear y poblar la tabla 'holidays'...")
    db = SessionLocal()
    try:
        # 1. Create table
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS holidays (
                id SERIAL PRIMARY KEY,
                date DATE UNIQUE NOT NULL,
                name VARCHAR(150) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                is_custom BOOLEAN DEFAULT FALSE
            );
        """))
        db.commit()
        print("Tabla 'holidays' creada o verificada con éxito.")

        # 2. Pre-load Colombian Holidays for 2026 and 2027
        co_holidays = holidays.Colombia(years=[2026, 2027])
        print(f"Obtenidos {len(co_holidays)} días festivos nacionales de Colombia desde la librería 'holidays'.")
        
        inserted_count = 0
        for holiday_date, name in sorted(co_holidays.items()):
            # Check if exists
            exists = db.execute(text("SELECT id FROM holidays WHERE date = :date"), {"date": holiday_date}).fetchone()
            if not exists:
                db.execute(text("""
                    INSERT INTO holidays (date, name, is_active, is_custom)
                    VALUES (:date, :name, TRUE, FALSE)
                """), {"date": holiday_date, "name": name})
                inserted_count += 1
                
        db.commit()
        print(f"Insertados {inserted_count} nuevos festivos en la base de datos.")
        print("Migración de festivos completada con éxito.")
    except Exception as e:
        db.rollback()
        print(f"Error durante la migración de festivos: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
