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

    total_employees = db.query(Employee).filter(Employee.is_active == True).count()

    # Presentes hoy (al menos un registro de entrada)
    present_ids = (
        db.query(AttendanceRecord.employee_id)
        .filter(
            AttendanceRecord.event_time >= today_start,
            AttendanceRecord.event_time <= today_end,
            AttendanceRecord.event_type == "entry",
            AttendanceRecord.employee_id.isnot(None),
        )
        .distinct()
        .subquery()
    )
    today_present = db.query(func.count()).select_from(present_ids).scalar() or 0
    today_absent = max(total_employees - today_present, 0)

    # Tardanzas hoy
    today_late = db.query(AttendanceRecord).filter(
        AttendanceRecord.event_time >= today_start,
        AttendanceRecord.event_time <= today_end,
        AttendanceRecord.is_late == True,
        AttendanceRecord.event_type == "entry",
    ).count()

    attendance_rate = round((today_present / total_employees * 100) if total_employees else 0, 1)

    cfg = db.query(DeviceConfig).first()

    return {
        "today_present": today_present,
        "today_absent": today_absent,
        "today_late": today_late,
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

    total_employees = db.query(Employee).filter(Employee.is_active == True).count()

    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())

        present = (
            db.query(func.count(func.distinct(AttendanceRecord.employee_id)))
            .filter(
                AttendanceRecord.event_time >= day_start,
                AttendanceRecord.event_time <= day_end,
                AttendanceRecord.event_type == "entry",
                AttendanceRecord.employee_id.isnot(None),
            )
            .scalar() or 0
        )
        late = db.query(AttendanceRecord).filter(
            AttendanceRecord.event_time >= day_start,
            AttendanceRecord.event_time <= day_end,
            AttendanceRecord.is_late == True,
        ).count()

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
