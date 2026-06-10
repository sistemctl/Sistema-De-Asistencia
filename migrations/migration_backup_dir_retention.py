from backend.database import SessionLocal
from sqlalchemy import text

def run_migration():
    print("Iniciando migración para agregar columnas de backup en 'system_config'...")
    db = SessionLocal()
    try:
        # 1. Verificar/Agregar backup_dir
        check_backup_dir = db.execute(text("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'system_config' AND COLUMN_NAME = 'backup_dir';
        """)).fetchone()
        
        if check_backup_dir:
            print("La columna 'backup_dir' ya existe en 'system_config'.")
        else:
            db.execute(text("""
                ALTER TABLE system_config 
                ADD COLUMN backup_dir VARCHAR(255) DEFAULT 'backups';
            """))
            print("Columna 'backup_dir' agregada con éxito.")

        # 2. Verificar/Agregar backup_retention_days
        check_retention = db.execute(text("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'system_config' AND COLUMN_NAME = 'backup_retention_days';
        """)).fetchone()
        
        if check_retention:
            print("La columna 'backup_retention_days' ya existe en 'system_config'.")
        else:
            db.execute(text("""
                ALTER TABLE system_config 
                ADD COLUMN backup_retention_days INTEGER DEFAULT 7;
            """))
            print("Columna 'backup_retention_days' agregada con éxito.")
            
        db.commit()
        print("Migración de parámetros de backup en 'system_config' finalizada.")
        
    except Exception as e:
        db.rollback()
        print(f"Error durante la migración de system_config: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
