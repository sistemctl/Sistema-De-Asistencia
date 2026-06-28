"""Router del dashboard: KPIs, datos semanales, eventos recientes."""
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from backend.auth import get_current_user
from backend.database import get_db
from backend.models import AttendanceRecord, DeviceConfig, Employee

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/kpis")
def get_kpis(date: str = None, db: Session = Depends(get_db), _=Depends(get_current_user)):
    from backend.utils import get_local_now
    if date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            target_date = get_local_now().date()
    else:
        target_date = get_local_now().date()

    from backend.services.attendance_processor import process_daily_attendance_bulk
    
    summaries = process_daily_attendance_bulk(db, target_date)
    total_employees = len(summaries)
    today_present = sum(1 for s in summaries if s["is_present"])
    today_absent = total_employees - today_present
    today_late = sum(1 for s in summaries if s["is_late"])

    attendance_rate = round((today_present / total_employees * 100) if total_employees else 0, 1)

    from backend.models import EmployeeLeave
    today_leaves = db.query(EmployeeLeave).filter(
        EmployeeLeave.start_date <= target_date,
        EmployeeLeave.end_date >= target_date
    ).count()

    cfg = db.query(DeviceConfig).first()

    # Calcular cuántos empleados activos ya debieron haber entrado hoy y no lo han hecho
    today_unmarked_count = 0
    
    # Solo calcular si target_date es hoy para que tenga sentido el tiempo actual de control
    if target_date == get_local_now().date():
        current_time_str = get_local_now().strftime("%H:%M")
        
        # Batch query all active employees with their schedules
        active_employees = db.query(Employee).options(joinedload(Employee.schedule)).filter(Employee.is_active == True).all()
        emp_dict = {e.id: e for e in active_employees}
        
        # Batch query all employee IDs with active leaves today
        from backend.models import EmployeeLeave
        active_leaves_emp_ids = set(
            r[0] for r in db.query(EmployeeLeave.employee_id).filter(
                EmployeeLeave.start_date <= target_date,
                EmployeeLeave.end_date >= target_date
            ).all()
        )
        
        for s in summaries:
            if not s["is_present"]:
                emp = emp_dict.get(s["employee_id"])
                if emp and emp.schedule:
                    start_time = emp.schedule.work_start_time # formato "HH:MM"
                    if start_time and start_time <= current_time_str:
                        if emp.id not in active_leaves_emp_ids:
                            today_unmarked_count += 1

    return {
        "target_date": target_date.isoformat(),
        "today_present": today_present,
        "today_absent": today_absent,
        "today_late": today_late,
        "today_leaves": today_leaves,
        "today_unmarked_count": today_unmarked_count,
        "total_employees": total_employees,
        "attendance_rate": attendance_rate,
        "last_sync": cfg.last_successful_sync.isoformat() if cfg and cfg.last_successful_sync else None,
        "device_online": cfg.is_online if cfg else False,
    }


@router.get("/weekly")
def get_weekly_data(db: Session = Depends(get_db), _=Depends(get_current_user)):
    from backend.utils import get_local_now
    today = get_local_now().date()
    labels, present_list, absent_list, late_list = [], [], [], []

    from backend.services.attendance_processor import process_daily_attendance_bulk
    
    total_employees = db.query(Employee).filter(Employee.is_active == True).count()

    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        
        summaries = process_daily_attendance_bulk(db, day)
        present = sum(1 for s in summaries if s["is_present"])
        late = sum(1 for s in summaries if s["is_late"])

        labels.append(day.strftime("%a %d/%m"))
        present_list.append(present)
        absent_list.append(max(total_employees - present, 0))
        late_list.append(late)

    return {"labels": labels, "present": present_list, "absent": absent_list, "late": late_list}


@router.get("/recent-events")
def get_recent_events(limit: int = 8, db: Session = Depends(get_db), _=Depends(get_current_user)):
    records = (
        db.query(AttendanceRecord)
        .order_by(AttendanceRecord.event_time.desc())
        .limit(limit)
        .all()
    )
    result = []
    for r in records:
        emp = r.employee
        result.append({
            "employee_name": emp.full_name if emp else "Desconocido",
            "employee_code": emp.employee_code if emp else "-",
            "event_time": r.event_time.isoformat(),
            "event_type": r.event_type,
            "auth_method": r.auth_method,
            "photo_path": emp.photo_path if emp else None,
            "is_late": r.is_late,
            "department": emp.department.name if (emp and emp.department) else "N/A"
        })
    return result



@router.get("/kpis/details")
def get_kpi_details(type: str, date: str = None, db: Session = Depends(get_db), _=Depends(get_current_user)):
    from backend.utils import get_local_now
    from backend.services.attendance_processor import process_daily_attendance_bulk
    
    if date:
        try:
            today = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            today = get_local_now().date()
    else:
        today = get_local_now().date()
    summaries = process_daily_attendance_bulk(db, today)
    
    # Cargar todos los empleados activos
    employees_by_id = {emp.id: emp for emp in db.query(Employee).filter(Employee.is_active == True).all()}
    
    result = []
    if type == "total":
        for s in summaries:
            emp = employees_by_id.get(s["employee_id"])
            if emp:
                result.append({
                    "employee_code": s["employee_code"],
                    "full_name": s["employee_name"],
                    "department": s["department"],
                    "position": emp.position.name if emp.position else "-",
                    "status": "Activo"
                })
    elif type == "present":
        for s in summaries:
            if s["is_present"]:
                emp = employees_by_id.get(s["employee_id"])
                entry_time = s["punches"]["entry_1"]
                formatted_entry = "-"
                if entry_time:
                    try:
                        formatted_entry = datetime.fromisoformat(entry_time).strftime("%I:%M %p")
                    except Exception:
                        formatted_entry = entry_time
                result.append({
                    "employee_code": s["employee_code"],
                    "full_name": s["employee_name"],
                    "department": s["department"],
                    "position": emp.position.name if emp and emp.position else "-",
                    "check_in": formatted_entry
                })
    elif type == "absent":
        for s in summaries:
            if not s["is_present"]:
                emp = employees_by_id.get(s["employee_id"])
                result.append({
                    "employee_code": s["employee_code"],
                    "full_name": s["employee_name"],
                    "department": s["department"],
                    "position": emp.position.name if emp and emp.position else "-",
                    "details": "Sin registro de entrada"
                })
    elif type == "late":
        for s in summaries:
            if s["is_late"]:
                emp = employees_by_id.get(s["employee_id"])
                entry_time = s["punches"]["entry_1"]
                formatted_entry = "-"
                if entry_time:
                    try:
                        formatted_entry = datetime.fromisoformat(entry_time).strftime("%I:%M %p")
                    except Exception:
                        formatted_entry = entry_time
                
                # Calcular minutos de retraso si es posible
                delay_str = "Tarde"
                if entry_time and emp and emp.schedule:
                    try:
                        sched_start = emp.schedule.work_start_time
                        entry_dt = datetime.fromisoformat(entry_time)
                        sched_dt = datetime.combine(today, datetime.strptime(sched_start, "%H:%M").time())
                        diff = (entry_dt - sched_dt).total_seconds() / 60.0
                        if diff > 0:
                            delay_str = f"{int(diff)} min tarde"
                    except Exception:
                        pass
                
                result.append({
                    "employee_code": s["employee_code"],
                    "full_name": s["employee_name"],
                    "department": s["department"],
                    "position": emp.position.name if emp and emp.position else "-",
                    "check_in": formatted_entry,
                    "delay": delay_str
                })
    elif type == "leaves":
        from backend.models import EmployeeLeave
        active_leaves = (
            db.query(EmployeeLeave)
            .filter(
                EmployeeLeave.start_date <= today,
                EmployeeLeave.end_date >= today
            )
            .all()
        )
        leave_labels = {
            "vacation": "Vacaciones",
            "medical": "Incapacidad Médica",
            "paid_leave": "Licencia Remunerada",
            "unpaid_leave": "Licencia No Remunerada",
            "suspension": "Suspensión"
        }
        for leave in active_leaves:
            emp = leave.employee
            if emp and emp.is_active:
                result.append({
                    "employee_code": emp.employee_code,
                    "full_name": emp.full_name,
                    "department": emp.department.name if emp.department else "-",
                    "position": emp.position.name if emp.position else "-",
                    "leave_type": leave_labels.get(leave.leave_type, leave.leave_type)
                })
            
    return result


