from backend.database import SessionLocal
from sqlalchemy import text

def run_migration():
    print("Iniciando migración para agregar columna 'document_path' en 'attendance_justifications'...")
    db = SessionLocal()
    try:
        # Verificar si la columna ya existe
        check_query = text("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'attendance_justifications' AND COLUMN_NAME = 'document_path';
        """)
        result = db.execute(check_query).fetchone()
        
        if result:
            print("La columna 'document_path' ya existe en 'attendance_justifications'. Omitiendo.")
        else:
            # Agregar la columna
            db.execute(text("""
                ALTER TABLE attendance_justifications 
                ADD COLUMN document_path VARCHAR(500);
            """))
            db.commit()
            print("Columna 'document_path' agregada con éxito a 'attendance_justifications'.")
            
    except Exception as e:
        db.rollback()
        print(f"Error durante la migración de justificaciones: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
