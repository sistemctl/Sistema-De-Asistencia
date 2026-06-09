from backend.database import SessionLocal
from sqlalchemy import text

def run_migration():
    print("Iniciando migración para agregar columna 'automatic_sync_enabled' en 'device_config'...")
    db = SessionLocal()
    try:
        # Verificar si la columna ya existe
        check_query = text("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'device_config' AND COLUMN_NAME = 'automatic_sync_enabled';
        """)
        result = db.execute(check_query).fetchone()
        
        if result:
            print("La columna 'automatic_sync_enabled' ya existe en 'device_config'. Omitiendo.")
        else:
            # Agregar la columna
            db.execute(text("""
                ALTER TABLE device_config 
                ADD COLUMN automatic_sync_enabled BOOLEAN DEFAULT TRUE;
            """))
            # Poner en true para registros existentes
            db.execute(text("""
                UPDATE device_config SET automatic_sync_enabled = TRUE WHERE automatic_sync_enabled IS NULL;
            """))
            db.commit()
            print("Columna 'automatic_sync_enabled' agregada con éxito a 'device_config'.")
            
    except Exception as e:
        db.rollback()
        print(f"Error durante la migración de device_config: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
