"""Router de asistencia: listado, filtros, estadísticas."""
from datetime import datetime, date
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException, status, Form, File, UploadFile
from sqlalchemy.orm import Session
from pathlib import Path

from backend.auth import get_current_user, check_permission_or
get_current_user = check_permission_or("perm_manage_attendance", "perm_export_reports")

from backend.database import get_db
from backend.models import AttendanceRecord, Employee, AttendanceJustification
from backend.schemas import AttendanceOut, AttendanceJustificationCreate, AttendanceJustificationOut

from pydantic import BaseModel

class ManualPunchCreate(BaseModel):
    employee_id: int
    event_time: datetime
    event_type: str  # 'entry' or 'exit'

router = APIRouter(prefix="/api/attendance", tags=["attendance"])


@router.post("/manual", status_code=201)
def create_manual_punch(
    data: ManualPunchCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Enforce perm_manage_attendance
    if not (current_user.role == "admin" or getattr(current_user, "perm_manage_attendance", False)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para registrar asistencias manualmente"
        )

    # Check employee
    emp = db.query(Employee).filter(Employee.id == data.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    # Check if punch on exactly that time exists
    exists = db.query(AttendanceRecord).filter(
        AttendanceRecord.employee_id == data.employee_id,
        AttendanceRecord.event_time == data.event_time
    ).first()
    if exists:
        raise HTTPException(status_code=400, detail="Ya existe un registro en esta fecha y hora para este empleado")

    # Determine late status if entry
    is_late = False
    if data.event_type == "entry":
        # Check tolerance vs schedule start time
        from backend.models import SystemConfig
        sys_config = db.query(SystemConfig).first()
        tolerance_enable = sys_config.tolerance_enable if (sys_config and hasattr(sys_config, 'tolerance_enable')) else True
        flexible_shift_enable = sys_config.flexible_shift_enable if (sys_config and hasattr(sys_config, 'flexible_shift_enable')) else True
        flexible_shift_end_str = sys_config.flexible_shift_end if (sys_config and hasattr(sys_config, 'flexible_shift_end')) else "18:00:00"
        
        tolerance = sys_config.entry_tolerance_minutes if (sys_config and tolerance_enable) else 0
        
        # We can calculate is_late based on employee base schedule
        if emp.schedule:
            sched = emp.schedule
            is_flexible_sched = False
            if flexible_shift_enable:
                sched_name = (sched.name or "").lower()
                if "flexible" in sched_name or "flex" in sched_name:
                    is_flexible_sched = True

            if is_flexible_sched:
                try:
                    eh, em = map(int, flexible_shift_end_str.split(":")[:2])
                    limit_min = eh * 60 + em + tolerance
                    punch_min = data.event_time.hour * 60 + data.event_time.minute
                    if punch_min > limit_min:
                        is_late = True
                except Exception:
                    pass
            else:
                sched_time_str = sched.work_start_time
                try:
                    sh, sm = map(int, sched_time_str.split(":"))
                    limit_min = sh * 60 + sm + tolerance
                    punch_min = data.event_time.hour * 60 + data.event_time.minute
                    if punch_min > limit_min:
                        is_late = True
                except Exception:
                    pass

    record = AttendanceRecord(
        employee_id=data.employee_id,
        device_user_id=emp.employee_code,
        event_time=data.event_time,
        event_type=data.event_type,
        auth_method="manual",
        is_late=is_late,
        raw_data='{"source": "manual_admin"}'
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    from backend.services.audit import log_action
    log_action(db, current_user.id, "CREATE", "AttendanceRecord", str(record.id), f"Marcación manual registrada ({data.event_type}) para {emp.full_name} a las {data.event_time}")

    return _serialize(record)


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


@router.post("/justify", response_model=AttendanceJustificationOut, status_code=201)
async def create_or_update_justification(
    employee_id: int = Form(...),
    date: date = Form(...),
    justification_type: str = Form(...),
    reason: str = Form(...),
    override_status: str = Form(...),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Enforce perm_manage_attendance
    if not (current_user.role == "admin" or getattr(current_user, "perm_manage_attendance", False)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para gestionar asistencias"
        )
    
    # Check if employee exists
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    # Find existing justification for employee and date
    just = db.query(AttendanceJustification).filter(
        AttendanceJustification.employee_id == employee_id,
        AttendanceJustification.date == date
    ).first()

    # Create justifications directory
    from backend.config import BASE_DIR
    just_dir = BASE_DIR / "uploads" / "justifications"
    just_dir.mkdir(parents=True, exist_ok=True)

    document_path = None
    if file and file.filename:
        # Validate size (max 5MB)
        contents = await file.read()
        if len(contents) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="El archivo excede el tamaño máximo permitido de 5MB")

        # Validate extension
        suffix = Path(file.filename).suffix.lower()
        if suffix not in [".pdf", ".jpg", ".jpeg", ".png"]:
            raise HTTPException(status_code=400, detail="Formato de archivo no permitido. Solo se aceptan PDFs e imágenes (JPG, PNG)")

        # Unique file name
        filename = f"just_{employee_id}_{date}{suffix}"
        file_path = just_dir / filename
        
        # Save file to disk
        with open(file_path, "wb") as f:
            f.write(contents)
            
        document_path = f"justifications/{filename}"

    if just:
        just.justification_type = justification_type
        just.reason = reason
        just.override_status = override_status
        if document_path:
            # Delete old file
            if just.document_path:
                old_file_path = BASE_DIR / "uploads" / just.document_path
                if old_file_path.exists():
                    try:
                        old_file_path.unlink()
                    except Exception as e:
                        import logging
                        logging.getLogger(__name__).error(f"Error al eliminar justificante anterior: {e}")
            just.document_path = document_path
    else:
        just = AttendanceJustification(
            employee_id=employee_id,
            date=date,
            justification_type=justification_type,
            reason=reason,
            override_status=override_status,
            document_path=document_path
        )
        db.add(just)

    db.commit()
    db.refresh(just)

    from backend.services.audit import log_action
    action_type = "UPDATE" if just.id else "CREATE"
    log_action(db, current_user.id, action_type, "AttendanceJustification", str(just.id), f"Justificada inasistencia/retardo para {emp.full_name} el día {date}")

    return just


@router.delete("/justify/{justification_id}", status_code=204)
def delete_justification(
    justification_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Enforce perm_manage_attendance
    if not (current_user.role == "admin" or getattr(current_user, "perm_manage_attendance", False)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para gestionar asistencias"
        )

    just = db.query(AttendanceJustification).filter(AttendanceJustification.id == justification_id).first()
    if not just:
        raise HTTPException(status_code=404, detail="Justificación no encontrada")

    # Delete file from disk if exists
    if just.document_path:
        from backend.config import BASE_DIR
        file_path = BASE_DIR / "uploads" / just.document_path
        if file_path.exists():
            try:
                file_path.unlink()
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Error al eliminar archivo físico de justificación {justification_id}: {e}")

    # Log audit action
    emp = just.employee
    emp_name = emp.full_name if emp else "Desconocido"
    from backend.services.audit import log_action
    log_action(db, current_user.id, "DELETE", "AttendanceJustification", str(justification_id), f"Eliminada justificación para {emp_name} el día {just.date}")

    db.delete(just)
    db.commit()

