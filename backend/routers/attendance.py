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
