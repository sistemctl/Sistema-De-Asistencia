import sys
import os
from datetime import datetime, timedelta
import random

# Añadir el directorio actual al path para importar backend
sys.path.append(os.getcwd())

from backend.database import SessionLocal, engine
from backend.models import Department, Position, Schedule, Employee, AttendanceRecord

def generate_test_data():
    db = SessionLocal()
    try:
        print("🧪 Generando datos de prueba...")

        # 1. Departamentos
        depts_names = ["Recursos Humanos", "IT", "Ventas", "Operaciones"]
        depts = []
        for name in depts_names:
            dept = db.query(Department).filter(Department.name == name).first()
            if not dept:
                dept = Department(name=name, description=f"Departamento de {name}")
                db.add(dept)
                db.flush()
            depts.append(dept)
        
        # 2. Cargos
        pos_names = ["Gerente", "Analista", "Desarrollador", "Asistente"]
        positions = []
        for name in pos_names:
            pos = db.query(Position).filter(Position.name == name).first()
            if not pos:
                pos = Position(name=name, description=f"Cargo de {name}")
                db.add(pos)
                db.flush()
            positions.append(pos)

        # 3. Horarios
        schedules_data = [
            {"name": "Turno Mañana", "start": "07:00", "end": "16:00"},
            {"name": "Turno Tarde", "start": "13:00", "end": "21:00"},
            {"name": "Administrativo", "start": "08:00", "end": "18:00"}
        ]
        schedules = []
        for s in schedules_data:
            sch = db.query(Schedule).filter(Schedule.name == s["name"]).first()
            if not sch:
                sch = Schedule(
                    name=s["name"], 
                    work_start_time=s["start"], 
                    work_end_time=s["end"],
                    shift_type="continuous"
                )
                db.add(sch)
                db.flush()
            schedules.append(sch)

        # 4. Empleados
        names = [
            ("Juan", "Pérez"), ("María", "García"), ("Carlos", "Rodríguez"), 
            ("Ana", "Martínez"), ("Luis", "López"), ("Elena", "Sánchez")
        ]
        employees = []
        for i, (fname, lname) in enumerate(names):
            code = f"EMP{100 + i}"
            emp = db.query(Employee).filter(Employee.employee_code == code).first()
            if not emp:
                emp = Employee(
                    employee_code=code,
                    device_user_id=str(1000 + i),
                    first_name=fname,
                    last_name=lname,
                    email=f"{fname.lower()}.{lname.lower()}@example.com",
                    department_id=random.choice(depts).id,
                    position_id=random.choice(positions).id,
                    schedule_id=random.choice(schedules).id,
                    is_active=True
                )
                db.add(emp)
                db.flush()
            employees.append(emp)

        # 5. Registros de asistencia (últimos 3 días)
        print("🕒 Generando registros de asistencia...")
        for emp in employees:
            for d in range(3):
                date = datetime.now() - timedelta(days=d)
                
                # Entrada
                entry_time = date.replace(hour=8, minute=random.randint(0, 15), second=0)
                if not db.query(AttendanceRecord).filter(
                    AttendanceRecord.employee_id == emp.id, 
                    AttendanceRecord.event_time == entry_time
                ).first():
                    db.add(AttendanceRecord(
                        employee_id=emp.id,
                        device_user_id=emp.device_user_id,
                        event_time=entry_time,
                        event_type="entry",
                        auth_method="face",
                        is_late=entry_time.minute > 5
                    ))

                # Salida
                exit_time = date.replace(hour=17, minute=random.randint(0, 10), second=0)
                if not db.query(AttendanceRecord).filter(
                    AttendanceRecord.employee_id == emp.id, 
                    AttendanceRecord.event_time == exit_time
                ).first():
                    db.add(AttendanceRecord(
                        employee_id=emp.id,
                        device_user_id=emp.device_user_id,
                        event_time=exit_time,
                        event_type="exit",
                        auth_method="face"
                    ))

        db.commit()
        print("✅ Datos de prueba generados exitosamente.")

    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    generate_test_data()
