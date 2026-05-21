"""Router de asistencia: listado, filtros, estadísticas."""
from datetime import datetime, date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.auth import get_current_user
from backend.database import get_db
from backend.models import AttendanceRecord, Employee
from backend.schemas import AttendanceOut

router = APIRouter(prefix="/api/attendance", tags=["attendance"])


@router.get("", response_model=dict)
def list_attendance(
    employee_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    event_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(AttendanceRecord)

    if employee_id:
        q = q.filter(AttendanceRecord.employee_id == employee_id)
    if date_from:
        q = q.filter(AttendanceRecord.event_time >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        q = q.filter(AttendanceRecord.event_time <= datetime.combine(date_to, datetime.max.time()))
    if event_type:
        q = q.filter(AttendanceRecord.event_type == event_type)

    if search:
        q = q.join(Employee).filter(
            (Employee.first_name.ilike(f"%{search}%")) |
            (Employee.last_name.ilike(f"%{search}%")) |
            (Employee.employee_code.ilike(f"%{search}%"))
        )

    total = q.count()
    records = q.order_by(AttendanceRecord.event_time.desc()) \
               .offset((page - 1) * page_size) \
               .limit(page_size) \
               .all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
        "items": [_serialize(r) for r in records],
    }

@router.get("/daily-summary", response_model=dict)
def get_daily_summary(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    employee_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    from backend.services.attendance_processor import process_daily_attendance_bulk
    from datetime import timedelta
    from backend.utils import get_local_now

    if not date_from:
        date_from = get_local_now().date()
    if not date_to:
        date_to = get_local_now().date()
        
    delta = date_to - date_from
    days = [date_from + timedelta(days=i) for i in range(delta.days + 1)]
    days.reverse() # newer first
    
    all_summaries = []
    for d in days:
        daily_summaries = process_daily_attendance_bulk(db, d)
        all_summaries.extend(daily_summaries)
        
    # Filter
    filtered = []
    for s in all_summaries:
        match = True
        if employee_id and s["employee_id"] != employee_id:
            match = False
        if search:
            search_lower = search.lower()
            if search_lower not in s["employee_name"].lower() and search_lower not in s["employee_code"].lower():
                match = False
        if match:
            filtered.append(s)
            
    total = len(filtered)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size if page_size else 0,
        "items": filtered[start_idx:end_idx]
    }


@router.get("/today")
def today_records(db: Session = Depends(get_db), _=Depends(get_current_user)):
    from backend.utils import get_local_now
    today = get_local_now().date()
    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.event_time >= datetime.combine(today, datetime.min.time()),
        AttendanceRecord.event_time <= datetime.combine(today, datetime.max.time()),
    ).order_by(AttendanceRecord.event_time.desc()).all()
    return [_serialize(r) for r in records]


@router.get("/recent")
def recent_events(limit: int = Query(10, ge=1, le=50), db: Session = Depends(get_db), _=Depends(get_current_user)):
    records = db.query(AttendanceRecord) \
                .order_by(AttendanceRecord.event_time.desc()) \
                .limit(limit).all()
    return [_serialize(r) for r in records]


def _serialize(r: AttendanceRecord) -> dict:
    emp = r.employee
    return {
        "id": r.id,
        "employee_id": r.employee_id,
        "employee_name": emp.full_name if emp else "Desconocido",
        "employee_code": emp.employee_code if emp else "-",
        "department": emp.department.name if emp and emp.department else "-",
        "photo_path": emp.photo_path if emp else None,
        "event_time": r.event_time.isoformat(),
        "event_type": r.event_type,
        "auth_method": r.auth_method,
        "is_late": r.is_late,
        "temperature": r.temperature,
    }
