"""Router de reportes: exportar Excel y PDF."""
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io

from backend.auth import get_current_user
from backend.database import get_db
from backend.services.report_generator import generate_excel_report, generate_pdf_report, generate_consolidated_excel

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/excel")
def export_excel(
    employee_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    df = datetime.combine(date_from, datetime.min.time()) if date_from else None
    dt = datetime.combine(date_to, datetime.max.time()) if date_to else None

    content = generate_excel_report(db, employee_id=employee_id, date_from=df, date_to=dt)
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
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    df = datetime.combine(date_from, datetime.min.time()) if date_from else None
    dt = datetime.combine(date_to, datetime.max.time()) if date_to else None

    content = generate_pdf_report(db, employee_id=employee_id, date_from=df, date_to=dt)
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
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    df = datetime.combine(date_from, datetime.min.time()) if date_from else None
    dt = datetime.combine(date_to, datetime.max.time()) if date_to else None

    content = generate_consolidated_excel(db, date_from=df, date_to=dt)
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
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    from backend.utils import get_local_now
    from datetime import datetime, timedelta
    from sqlalchemy import func
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
    
    total_employees = employee_query.count()
    employee_ids = [e.id for e in employee_query.all()]

    if not employee_ids:
        # Si la búsqueda no coincide con ningún empleado, retornar resultados vacíos.
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

    total_absent = 0
    current_day = date_from
    while current_day <= date_to:
        if current_day.weekday() < 5:
            d_str = current_day.isoformat()
            present_count = len(present_by_date.get(d_str, []))
            absent_count = max(total_employees - present_count, 0)
            total_absent += absent_count
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
