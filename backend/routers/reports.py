"""Router de reportes: exportar Excel, PDF y Analíticas Avanzadas por Grupo."""
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io

from backend.auth import get_current_user
from backend.database import get_db
from backend.services.report_generator import (
    generate_excel_report,
    generate_pdf_report,
    generate_consolidated_excel,
    generate_attendance_excel,
    generate_attendance_pdf,
)
from backend.services.attendance_processor import process_attendance_report

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/report")
def get_attendance_report(
    employee_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    granularity: str = Query("daily"),
    search: Optional[str] = Query(None),
    department_id: Optional[int] = Query(None),
    position_id: Optional[int] = Query(None),
    schedule_id: Optional[int] = Query(None),
    export: Optional[str] = Query(None),  # 'excel' or 'pdf'
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    from backend.utils import get_local_now
    from datetime import timedelta

    if not date_from:
        date_from = (get_local_now() - timedelta(days=30)).date()
    if not date_to:
        date_to = get_local_now().date()

    results = process_attendance_report(
        db,
        date_from=date_from,
        date_to=date_to,
        employee_id=employee_id,
        search=search,
        granularity=granularity,
        department_id=department_id,
        position_id=position_id,
        schedule_id=schedule_id
    )

    if export == "excel":
        content = generate_attendance_excel(results, granularity)
        filename = f"reporte_asistencia_{granularity}_{date.today().isoformat()}.xlsx"
        return StreamingResponse(
            io.BytesIO(content),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    elif export == "pdf":
        content = generate_attendance_pdf(results, granularity)
        filename = f"reporte_asistencia_{granularity}_{date.today().isoformat()}.pdf"
        return StreamingResponse(
            io.BytesIO(content),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    total = len(results)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    items = results[start_idx:end_idx]

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size if page_size else 0,
        "items": items
    }


@router.get("/excel")
def export_excel(
    employee_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    department_id: Optional[int] = Query(None),
    position_id: Optional[int] = Query(None),
    schedule_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    df = datetime.combine(date_from, datetime.min.time()) if date_from else None
    dt = datetime.combine(date_to, datetime.max.time()) if date_to else None

    content = generate_excel_report(
        db, 
        employee_id=employee_id, 
        date_from=df, 
        date_to=dt,
        department_id=department_id,
        position_id=position_id,
        schedule_id=schedule_id
    )
    filename = f"asistencia_{date.today().isoformat()}.xlsx"
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/pdf")
def export_pdf(
    employee_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    department_id: Optional[int] = Query(None),
    position_id: Optional[int] = Query(None),
    schedule_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    df = datetime.combine(date_from, datetime.min.time()) if date_from else None
    dt = datetime.combine(date_to, datetime.max.time()) if date_to else None

    content = generate_pdf_report(
        db, 
        employee_id=employee_id, 
        date_from=df, 
        date_to=dt,
        department_id=department_id,
        position_id=position_id,
        schedule_id=schedule_id
    )
    filename = f"asistencia_{date.today().isoformat()}.pdf"
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/consolidated")
def export_consolidated(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    department_id: Optional[int] = Query(None),
    position_id: Optional[int] = Query(None),
    schedule_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    df = datetime.combine(date_from, datetime.min.time()) if date_from else None
    dt = datetime.combine(date_to, datetime.max.time()) if date_to else None

    content = generate_consolidated_excel(
        db, 
        date_from=df, 
        date_to=dt,
        department_id=department_id,
        position_id=position_id,
        schedule_id=schedule_id
    )
    filename = f"consolidado_asistencia_{date.today().isoformat()}.xlsx"
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/analytics")
def get_analytics(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    search: Optional[str] = Query(None),
    department_id: Optional[int] = Query(None),
    position_id: Optional[int] = Query(None),
    schedule_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    from backend.utils import get_local_now
    from datetime import datetime, timedelta
    from backend.models import Employee, AttendanceRecord

    if not date_from:
        date_from = (get_local_now() - timedelta(days=30)).date()
    if not date_to:
        date_to = get_local_now().date()

    df = datetime.combine(date_from, datetime.min.time())
    dt = datetime.combine(date_to, datetime.max.time())

    employee_query = db.query(Employee).filter(Employee.is_active == True)
    if search:
        employee_query = employee_query.filter(
            (Employee.first_name.ilike(f"%{search}%")) |
            (Employee.last_name.ilike(f"%{search}%")) |
            (Employee.employee_code.ilike(f"%{search}%"))
        )
    if department_id:
        employee_query = employee_query.filter(Employee.department_id == department_id)
    if position_id:
        employee_query = employee_query.filter(Employee.position_id == position_id)
    if schedule_id:
        employee_query = employee_query.filter(Employee.schedule_id == schedule_id)
    
    employees = employee_query.all()
    total_employees = len(employees)
    employee_ids = [e.id for e in employees]

    if not employee_ids:
        # Si no coincide con ningún empleado, retornar resultados vacíos.
        return {
            "kpis": {
                "punctuality_rate": "100%",
                "total_lates": 0,
                "avg_entry_time": "--:--",
                "critical_day": "Ninguno"
            },
            "distribution": {
                "ontime": 0,
                "late": 0,
                "absent": 0,
                "leaves": 0
            },
            "trend": {
                "labels": [],
                "present": [],
                "late": []
            }
        }

    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.event_time >= df,
        AttendanceRecord.event_time <= dt,
        AttendanceRecord.employee_id.in_(employee_ids)
    ).all()

    entries = [r for r in records if r.event_type == "entry"]

    total_entries = len(entries)
    late_entries = sum(1 for r in entries if r.is_late)
    ontime_entries = total_entries - late_entries

    punctuality_rate = round((ontime_entries / total_entries * 100) if total_entries else 100, 1)

    avg_entry_time_str = "--:--"
    if entries:
        total_seconds = sum((r.event_time.hour * 3600 + r.event_time.minute * 60 + r.event_time.second) for r in entries)
        avg_seconds = total_seconds // len(entries)
        avg_hour = avg_seconds // 3600
        avg_min = (avg_seconds % 3600) // 60
        avg_entry_time_str = f"{avg_hour:02d}:{avg_min:02d}"

    day_names = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
    late_by_weekday = {i: 0 for i in range(7)}
    for r in entries:
        if r.is_late:
            late_by_weekday[r.event_time.weekday()] += 1

    critical_day_idx = max(late_by_weekday, key=late_by_weekday.get)
    critical_day = day_names[critical_day_idx] if late_by_weekday[critical_day_idx] > 0 else "Ninguno"

    present_by_date = {}
    for r in entries:
        d_str = r.event_time.date().isoformat()
        if d_str not in present_by_date:
            present_by_date[d_str] = set()
        present_by_date[d_str].add(r.employee_id)

    from backend.models import SystemConfig
    sys_config = db.query(SystemConfig).first()
    default_work_days = [int(x) for x in sys_config.work_days.split(",")] if sys_config and sys_config.work_days else [1, 2, 3, 4, 5]

    # Pre-parse workdays for each employee
    emp_work_days = {}
    for emp in employees:
        if emp.schedule and emp.schedule.work_days:
            try:
                emp_work_days[emp.id] = [int(x) for x in emp.schedule.work_days.split(",")]
            except Exception:
                emp_work_days[emp.id] = default_work_days
        else:
            emp_work_days[emp.id] = default_work_days

    total_absent = 0
    current_day = date_from
    while current_day <= date_to:
        d_str = current_day.isoformat()
        present_set = present_by_date.get(d_str, set())
        weekday = current_day.weekday() + 1
        
        for emp in employees:
            if emp.id not in present_set:
                if weekday in emp_work_days[emp.id]:
                    total_absent += 1
        current_day += timedelta(days=1)


    entries_by_day = {}
    late_by_day = {}
    current_day = date_from
    labels = []
    while current_day <= date_to:
        label = current_day.strftime("%d/%m")
        labels.append(label)
        entries_by_day[label] = 0
        late_by_day[label] = 0
        current_day += timedelta(days=1)

    for r in entries:
        label = r.event_time.strftime("%d/%m")
        if label in entries_by_day:
            entries_by_day[label] += 1
            if r.is_late:
                late_by_day[label] += 1

    trend_labels = labels
    trend_present = [entries_by_day[l] - late_by_day[l] for l in labels]
    trend_late = [late_by_day[l] for l in labels]

    return {
        "kpis": {
            "punctuality_rate": f"{punctuality_rate}%",
            "total_lates": late_entries,
            "avg_entry_time": avg_entry_time_str,
            "critical_day": critical_day
        },
        "distribution": {
            "ontime": ontime_entries,
            "late": late_entries,
            "absent": total_absent,
            "leaves": 3
        },
        "trend": {
            "labels": trend_labels,
            "present": trend_present,
            "late": trend_late
        }
    }
