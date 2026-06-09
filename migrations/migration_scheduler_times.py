from backend.database import SessionLocal
from sqlalchemy import text

def run_migration():
    print("Iniciando migración para agregar columnas de horario de tareas en 'system_config'...")
    db = SessionLocal()
    try:
        # 1. Verificar/Agregar daily_report_time
        check_report = db.execute(text("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'system_config' AND COLUMN_NAME = 'daily_report_time';
        """)).fetchone()
        
        if check_report:
            print("La columna 'daily_report_time' ya existe en 'system_config'.")
        else:
            db.execute(text("""
                ALTER TABLE system_config 
                ADD COLUMN daily_report_time VARCHAR(10) DEFAULT '19:00';
            """))
            print("Columna 'daily_report_time' agregada con éxito.")

        # 2. Verificar/Agregar absences_check_time
        check_absences = db.execute(text("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'system_config' AND COLUMN_NAME = 'absences_check_time';
        """)).fetchone()
        
        if check_absences:
            print("La columna 'absences_check_time' ya existe en 'system_config'.")
        else:
            db.execute(text("""
                ALTER TABLE system_config 
                ADD COLUMN absences_check_time VARCHAR(10) DEFAULT '11:00';
            """))
            print("Columna 'absences_check_time' agregada con éxito.")
            
        db.commit()
        print("Migración de horarios de tareas en 'system_config' finalizada.")
        
    except Exception as e:
        db.rollback()
        print(f"Error durante la migración de system_config: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
