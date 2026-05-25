"""Router del dashboard: KPIs, datos semanales, eventos recientes."""
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.auth import get_current_user
from backend.database import get_db
from backend.models import AttendanceRecord, DeviceConfig, Employee

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/kpis")
def get_kpis(db: Session = Depends(get_db), _=Depends(get_current_user)):
    from backend.utils import get_local_now
    today = get_local_now().date()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())

    from backend.services.attendance_processor import process_daily_attendance_bulk
    
    summaries = process_daily_attendance_bulk(db, today)
    total_employees = len(summaries)
    today_present = sum(1 for s in summaries if s["is_present"])
    today_absent = total_employees - today_present
    today_late = sum(1 for s in summaries if s["is_late"])

    attendance_rate = round((today_present / total_employees * 100) if total_employees else 0, 1)

    cfg = db.query(DeviceConfig).first()

    return {
        "today_present": today_present,
        "today_absent": today_absent,
        "today_late": today_late,
        "today_leaves": 3,  # Simulación para visualización en Chrome
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
        })
    return result

