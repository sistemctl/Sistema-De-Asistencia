from backend.database import SessionLocal
from sqlalchemy import text

def run_migration():
    print("Iniciando migración de base de datos para permisos adicionales granulares en users...")
    db = SessionLocal()
    try:
        columns = [
            ("perm_manage_attendance", "BOOLEAN DEFAULT FALSE"),
            ("perm_sync_device", "BOOLEAN DEFAULT FALSE"),
            ("perm_view_employees", "BOOLEAN DEFAULT FALSE")
        ]
        
        # Add columns if not exist
        for col_name, col_type in columns:
            sql = f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col_name} {col_type};"
            db.execute(text(sql))
        db.commit()
        print("Columnas de permisos adicionales agregadas o verificadas con éxito en la tabla 'users'.")
        
        # Update permissions based on role
        # admin role -> all permissions True
        db.execute(text("""
            UPDATE users 
            SET perm_manage_attendance = TRUE,
                perm_sync_device = TRUE,
                perm_view_employees = TRUE
            WHERE role = 'admin'
        """))
        
        # hr_admin role -> attendance, sync, view_employees True
        db.execute(text("""
            UPDATE users 
            SET perm_manage_attendance = TRUE,
                perm_sync_device = TRUE,
                perm_view_employees = TRUE
            WHERE role = 'hr_admin'
        """))
        
        # viewer / auditor role -> view_employees True
        db.execute(text("""
            UPDATE users 
            SET perm_view_employees = TRUE
            WHERE role = 'viewer'
        """))
        
        db.commit()
        print("Valores de nuevos permisos inicializados según el rol histórico de cada usuario.")
        print("Migración completada con éxito.")
    except Exception as e:
        db.rollback()
        print(f"Error durante la migración: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
