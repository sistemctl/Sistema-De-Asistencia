from backend.database import SessionLocal
from backend.models import Employee, AttendanceRecord
from sqlalchemy import text

def clean_database():
    print("Iniciando limpieza de empleados y asistencia...")
    db = SessionLocal()
    try:
        # 1. Eliminar registros de asistencia para evitar violaciones de clave foranea u registros huerfanos
        records_deleted = db.query(AttendanceRecord).delete()
        print(f"Eliminados {records_deleted} registros de asistencia.")

        # 2. Eliminar empleados
        employees_deleted = db.query(Employee).delete()
        print(f"Eliminados {employees_deleted} empleados.")

        db.commit()
        print("Limpieza completada con exito. La base de datos esta lista para re-importar.")
    except Exception as e:
        db.rollback()
        print(f"Error durante la limpieza: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    clean_database()
