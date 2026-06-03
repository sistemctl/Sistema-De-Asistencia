from backend.database import SessionLocal
from sqlalchemy import text

def run_migration():
    print("Iniciando migración de base de datos para permisos granulares en users...")
    db = SessionLocal()
    try:
        columns = [
            ("perm_manage_users", "BOOLEAN DEFAULT FALSE"),
            ("perm_manage_device", "BOOLEAN DEFAULT FALSE"),
            ("perm_manage_settings", "BOOLEAN DEFAULT FALSE"),
            ("perm_manage_employees", "BOOLEAN DEFAULT FALSE"),
            ("perm_manage_schedules", "BOOLEAN DEFAULT FALSE"),
            ("perm_export_reports", "BOOLEAN DEFAULT FALSE")
        ]
        
        # Add columns if not exist
        for col_name, col_type in columns:
            sql = f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col_name} {col_type};"
            db.execute(text(sql))
        db.commit()
        print("Columnas de permisos individuales agregadas o verificadas con éxito en la tabla 'users'.")
        
        # Update permissions based on role
        # admin role -> all permissions True
        db.execute(text("""
            UPDATE users 
            SET perm_manage_users = TRUE,
                perm_manage_device = TRUE,
                perm_manage_settings = TRUE,
                perm_manage_employees = TRUE,
                perm_manage_schedules = TRUE,
                perm_export_reports = TRUE
            WHERE role = 'admin'
        """))
        
        # hr_admin role -> employees, schedules, reports True
        db.execute(text("""
            UPDATE users 
            SET perm_manage_employees = TRUE,
                perm_manage_schedules = TRUE,
                perm_export_reports = TRUE
            WHERE role = 'hr_admin'
        """))
        
        # viewer role -> reports True
        db.execute(text("""
            UPDATE users 
            SET perm_export_reports = TRUE
            WHERE role = 'viewer'
        """))
        
        db.commit()
        print("Valores de permisos inicializados según el rol histórico de cada usuario.")
        print("Migración completada con éxito.")
    except Exception as e:
        db.rollback()
        print(f"Error durante la migración: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
