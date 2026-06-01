from backend.database import SessionLocal
from backend.models import Employee, AttendanceRecord

db = SessionLocal()
try:
    db.query(AttendanceRecord).delete()
    db.query(Employee).delete()
    db.commit()
    print("¡Base de datos limpiada! Empleados y registros de asistencia han sido borrados.")
except Exception as e:
    db.rollback()
    print(f"Error: {e}")
finally:
    db.close()
