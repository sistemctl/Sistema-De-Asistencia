"""Router de reportes: exportar Excel, PDF y Analíticas Avanzadas por Grupo."""
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io

from backend.auth import get_current_user, check_permission
get_current_user = check_permission("perm_export_reports")
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

import uuid
import threading

report_tasks = {}


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
    columns: Optional[str] = Query(None),
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

    cols_list = columns.split(",") if columns else None

    if export == "excel":
        content = generate_attendance_excel(results, granularity, columns=cols_list)
        filename = f"reporte_asistencia_{granularity}_{date.today().isoformat()}.xlsx"
        return StreamingResponse(
            io.BytesIO(content),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    elif export == "pdf":
        content = generate_attendance_pdf(results, granularity, columns=cols_list)
        filename = f"reporte_asistencia_{granularity}_{date.today().isoformat()}.pdf"
        return StreamingResponse(
            io.BytesIO(content),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    elif export == "csv":
        import csv
        output = io.StringIO()
        writer = csv.writer(output, delimiter=";", quoting=csv.QUOTE_MINIMAL)
        headers = ["Empleado", "Código", "Fecha", "Tipo Horario", "Entrada 1", "Salida 1", "Entrada 2", "Salida 2", "Presente", "Tardanza", "Horas Trabajadas"]
        writer.writerow(headers)
        for r in results:
            writer.writerow([
                r.get("employee_name", "-"),
                r.get("employee_code", "-"),
                r.get("date", "-"),
                r.get("schedule_type", "-"),
                r["punches"].get("entry_1") or "-",
                r["punches"].get("exit_1") or "-",
                r["punches"].get("entry_2") or "-",
                r["punches"].get("exit_2") or "-",
                "Sí" if r.get("is_present") else "No",
                "Sí" if r.get("is_late") else "No",
                r.get("hours_worked_str", "-")
            ])
        filename = f"reporte_asistencia_{granularity}_{date.today().isoformat()}.csv"
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8-sig")),
            media_type="text/csv",
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


@router.get("/report/async")
def get_attendance_report_async(
    employee_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    granularity: str = Query("daily"),
    search: Optional[str] = Query(None),
    department_id: Optional[int] = Query(None),
    position_id: Optional[int] = Query(None),
    schedule_id: Optional[int] = Query(None),
    columns: Optional[str] = Query(None),
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

    # Cleanup expired tasks (older than 10 minutes)
    now_time = datetime.now()
    expired_ids = [
        tid for tid, t in list(report_tasks.items()) 
        if (now_time - t.get("created_at", now_time)).total_seconds() > 600
    ]
    for tid in expired_ids:
        try:
            del report_tasks[tid]
        except KeyError:
            pass

    task_id = str(uuid.uuid4())
    report_tasks[task_id] = {
        "status": "processing",
        "progress": 0,
        "content": None,
        "filename": f"reporte_asistencia_{granularity}_{date.today().isoformat()}.pdf",
        "error": None,
        "created_at": now_time
    }

    cols_list = columns.split(",") if columns else None

    def background_pdf_gen(tid: str, res: list, gran: str, cols: Optional[list]):
        try:
            def update_progress(p: int):
                if tid in report_tasks:
                    report_tasks[tid]["progress"] = p

            content = generate_attendance_pdf(res, gran, progress_callback=update_progress, columns=cols)
            if tid in report_tasks:
                report_tasks[tid]["content"] = content
                report_tasks[tid]["status"] = "completed"
                report_tasks[tid]["progress"] = 100
        except Exception as e:
            import traceback
            traceback.print_exc()
            if tid in report_tasks:
                report_tasks[tid]["status"] = "failed"
                report_tasks[tid]["error"] = str(e)

    t = threading.Thread(target=background_pdf_gen, args=(task_id, results, granularity, cols_list), daemon=True)
    t.start()

    return {"task_id": task_id, "status": "processing"}


@router.get("/report/status/{task_id}")
def get_report_status(task_id: str, _=Depends(get_current_user)):
    if task_id not in report_tasks:
        return {"status": "not_found", "error": "Tarea no encontrada"}
    
    task = report_tasks[task_id]
    return {
        "status": task["status"],
        "progress": task["progress"],
        "error": task["error"]
    }


@router.get("/report/download/{task_id}")
def download_report(task_id: str, _=Depends(get_current_user)):
    if task_id not in report_tasks:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
        
    task = report_tasks[task_id]
    if task["status"] != "completed":
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="El reporte aún no está listo")

    content = task["content"]
    filename = task["filename"]
    
    # Limpiar de la memoria
    del report_tasks[task_id]
    
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


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
    columns: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    df = datetime.combine(date_from, datetime.min.time()) if date_from else None
    dt = datetime.combine(date_to, datetime.max.time()) if date_to else None

    cols_list = columns.split(",") if columns else None

    content = generate_consolidated_excel(
        db, 
        date_from=df, 
        date_to=dt,
        department_id=department_id,
        position_id=position_id,
        schedule_id=schedule_id,
        columns=cols_list
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
    from backend.models import Employee

    if not date_from:
        date_from = (get_local_now() - timedelta(days=30)).date()
    if not date_to:
        date_to = get_local_now().date()

    delta_days = (date_to - date_from).days + 1
    prev_date_from = date_from - timedelta(days=delta_days)
    prev_date_to = date_from - timedelta(days=1)

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

    if not total_employees:
        return {
            "kpis": {
                "punctuality_rate": "100%",
                "punctuality_rate_trend": 0.0,
                "total_lates": 0,
                "total_lates_trend": 0,
                "avg_entry_time": "--:--",
                "avg_entry_time_trend": 0,
                "critical_day": "Ninguno",
                "absence_rate": "0%",
                "absence_rate_trend": 0.0,
                "hours_worked": "0h",
                "hours_worked_trend": 0.0,
                "early_exits": 0,
                "early_exits_trend": 0
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

    current_results = process_attendance_report(
        db,
        date_from=date_from,
        date_to=date_to,
        search=search,
        department_id=department_id,
        position_id=position_id,
        schedule_id=schedule_id
    )

    previous_results = process_attendance_report(
        db,
        date_from=prev_date_from,
        date_to=prev_date_to,
        search=search,
        department_id=department_id,
        position_id=position_id,
        schedule_id=schedule_id
    )

    def compute_kpi_metrics(results):
        if not results:
            return {
                "punctuality_rate": 100.0,
                "total_lates": 0,
                "avg_entry_time": "--:--",
                "avg_entry_seconds": 0,
                "critical_day": "Ninguno",
                "absence_rate": 0.0,
                "total_absents": 0,
                "total_hours_worked": 0.0,
                "total_early_exits": 0
            }
        
        present_sums = [r for r in results if r["is_present"]]
        total_present = len(present_sums)
        late_count = sum(1 for r in present_sums if r["is_late"])
        ontime_count = total_present - late_count
        
        punctuality_rate = round((ontime_count / total_present * 100) if total_present else 100.0, 1)
        
        avg_entry_time_str = "--:--"
        avg_seconds = 0
        entry_times = []
        for r in present_sums:
            e1 = r["punches"].get("entry_1")
            if e1:
                try:
                    dt_val = datetime.fromisoformat(e1)
                    entry_times.append(dt_val.hour * 3600 + dt_val.minute * 60 + dt_val.second)
                except Exception:
                    pass
        if entry_times:
            avg_seconds = sum(entry_times) // len(entry_times)
            avg_hour = avg_seconds // 3600
            avg_min = (avg_seconds % 3600) // 60
            avg_entry_time_str = f"{avg_hour:02d}:{avg_min:02d}"

        day_names = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
        late_by_weekday = {i: 0 for i in range(7)}
        for r in present_sums:
            if r["is_late"]:
                try:
                    dt_val = date.fromisoformat(r["date"])
                    late_by_weekday[dt_val.weekday()] += 1
                except Exception:
                    pass
        critical_day_idx = max(late_by_weekday, key=late_by_weekday.get)
        critical_day = day_names[critical_day_idx] if late_by_weekday[critical_day_idx] > 0 else "Ninguno"

        absent_count = sum(1 for r in results if not r["is_present"] and not r["is_off"] and not r["leave_type"])
        total_expected = sum(1 for r in results if not r["is_off"])
        absence_rate = round((absent_count / total_expected * 100) if total_expected else 0.0, 1)
        
        total_hours = sum(r["hours_worked"] for r in results if r["hours_worked"] is not None)
        early_exits = sum(1 for r in results if r.get("is_early_exit"))
        
        return {
            "punctuality_rate": punctuality_rate,
            "total_lates": late_count,
            "avg_entry_time": avg_entry_time_str,
            "avg_entry_seconds": avg_seconds,
            "critical_day": critical_day,
            "absence_rate": absence_rate,
            "total_absents": absent_count,
            "total_hours_worked": round(total_hours, 1),
            "total_early_exits": early_exits
        }

    curr = compute_kpi_metrics(current_results)
    prev = compute_kpi_metrics(previous_results)

    punctuality_rate_trend = round(curr["punctuality_rate"] - prev["punctuality_rate"], 1)
    total_lates_trend = curr["total_lates"] - prev["total_lates"]
    absence_rate_trend = round(curr["absence_rate"] - prev["absence_rate"], 1)
    hours_worked_trend = round(curr["total_hours_worked"] - prev["total_hours_worked"], 1)
    early_exits_trend = curr["total_early_exits"] - prev["total_early_exits"]
    avg_entry_time_trend = curr["avg_entry_seconds"] - prev["avg_entry_seconds"]

    ontime_entries = sum(1 for r in current_results if r["is_present"] and not r["is_late"])
    late_entries = sum(1 for r in current_results if r["is_present"] and r["is_late"])
    absent_entries = curr["total_absents"]
    leave_entries = sum(1 for r in current_results if r["leave_type"] is not None)

    from collections import defaultdict
    entries_by_day = defaultdict(int)
    late_by_day = defaultdict(int)
    
    current_day = date_from
    labels = []
    while current_day <= date_to:
        label = current_day.strftime("%d/%m")
        labels.append(label)
        current_day += timedelta(days=1)
        
    for r in current_results:
        try:
            d_val = date.fromisoformat(r["date"])
            label = d_val.strftime("%d/%m")
            if r["is_present"]:
                entries_by_day[label] += 1
                if r["is_late"]:
                    late_by_day[label] += 1
        except Exception:
            pass

    trend_present = [entries_by_day[l] - late_by_day[l] for l in labels]
    trend_late = [late_by_day[l] for l in labels]

    return {
        "kpis": {
            "punctuality_rate": f"{curr['punctuality_rate']}%",
            "punctuality_rate_trend": punctuality_rate_trend,
            "total_lates": curr["total_lates"],
            "total_lates_trend": total_lates_trend,
            "avg_entry_time": curr["avg_entry_time"],
            "avg_entry_time_trend": avg_entry_time_trend,
            "critical_day": curr["critical_day"],
            "absence_rate": f"{curr['absence_rate']}%",
            "absence_rate_trend": absence_rate_trend,
            "hours_worked": f"{curr['total_hours_worked']}h",
            "hours_worked_trend": hours_worked_trend,
            "early_exits": curr["total_early_exits"],
            "early_exits_trend": early_exits_trend
        },
        "distribution": {
            "ontime": ontime_entries,
            "late": late_entries,
            "absent": absent_entries,
            "leaves": leave_entries
        },
        "trend": {
            "labels": labels,
            "present": trend_present,
            "late": trend_late
        }
    }


@router.get("/analytics/batch")
def get_analytics_batch(
    entity_type: str = Query("general"),  # 'general', 'departments', 'positions', 'schedules'
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
    from backend.models import Employee, Department, Position, Schedule

    if not date_from:
        date_from = (get_local_now() - timedelta(days=30)).date()
    if not date_to:
        date_to = get_local_now().date()

    # Run process_attendance_report for the full filtered set of employees
    raw_summaries = process_attendance_report(
        db,
        date_from=date_from,
        date_to=date_to,
        search=search,
        department_id=department_id,
        position_id=position_id,
        schedule_id=schedule_id
    )

    def compute_metrics(results):
        if not results:
            return {
                "punctuality": "100.0%",
                "lates": 0,
                "avg_entry": "--:--",
                "critical": "Ninguno"
            }
        present_sums = [r for r in results if r["is_present"]]
        total_present = len(present_sums)
        late_count = sum(1 for r in present_sums if r["is_late"])
        ontime_count = total_present - late_count
        punctuality_rate = round((ontime_count / total_present * 100) if total_present else 100.0, 1)
        
        avg_entry_time_str = "--:--"
        entry_times = []
        for r in present_sums:
            e1 = r["punches"].get("entry_1")
            if e1:
                try:
                    dt_val = datetime.fromisoformat(e1)
                    entry_times.append(dt_val.hour * 3600 + dt_val.minute * 60 + dt_val.second)
                except Exception:
                    pass
        if entry_times:
            avg_seconds = sum(entry_times) // len(entry_times)
            avg_hour = avg_seconds // 3600
            avg_min = (avg_seconds % 3600) // 60
            avg_entry_time_str = f"{avg_hour:02d}:{avg_min:02d}"

        day_names = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
        late_by_weekday = {i: 0 for i in range(7)}
        for r in present_sums:
            if r["is_late"]:
                try:
                    dt_val = date.fromisoformat(r["date"])
                    late_by_weekday[dt_val.weekday()] += 1
                except Exception:
                    pass
        critical_day_idx = max(late_by_weekday, key=late_by_weekday.get)
        critical_day = day_names[critical_day_idx] if late_by_weekday[critical_day_idx] > 0 else "Ninguno"
        
        return {
            "punctuality": f"{punctuality_rate}%",
            "lates": late_count,
            "avg_entry": avg_entry_time_str,
            "critical": critical_day
        }

    # Group daily summaries by employee_id
    from collections import defaultdict
    grouped = defaultdict(list)
    for s in raw_summaries:
        grouped[s["employee_id"]].append(s)

    output = []
    
    if entity_type == "general":
        # Return per-employee analytics
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
        for emp in employees:
            emp_summaries = grouped[emp.id]
            metrics = compute_metrics(emp_summaries)
            output.append({
                "id": emp.id,
                "name": emp.full_name,
                "code": emp.employee_code,
                "punctuality": metrics["punctuality"],
                "lates": metrics["lates"],
                "avg_entry": metrics["avg_entry"],
                "critical": metrics["critical"]
            })

    elif entity_type == "departments":
        dept_query = db.query(Department)
        if department_id:
            dept_query = dept_query.filter(Department.id == department_id)
        departments = dept_query.all()
        
        emp_depts = db.query(Employee.id, Employee.department_id).filter(Employee.is_active == True).all()
        dept_to_emps = defaultdict(list)
        for emp_id, d_id in emp_depts:
            if d_id:
                dept_to_emps[d_id].append(emp_id)
                
        for dept in departments:
            dept_emp_ids = dept_to_emps[dept.id]
            dept_summaries = []
            for eid in dept_emp_ids:
                dept_summaries.extend(grouped[eid])
            metrics = compute_metrics(dept_summaries)
            output.append({
                "id": dept.id,
                "name": dept.name,
                "code": None,
                "punctuality": metrics["punctuality"],
                "lates": metrics["lates"],
                "avg_entry": metrics["avg_entry"],
                "critical": metrics["critical"]
            })

    elif entity_type == "positions":
        pos_query = db.query(Position)
        if position_id:
            pos_query = pos_query.filter(Position.id == position_id)
        positions = pos_query.all()
        
        emp_pos = db.query(Employee.id, Employee.position_id).filter(Employee.is_active == True).all()
        pos_to_emps = defaultdict(list)
        for emp_id, p_id in emp_pos:
            if p_id:
                pos_to_emps[p_id].append(emp_id)
                
        for pos in positions:
            pos_emp_ids = pos_to_emps[pos.id]
            pos_summaries = []
            for eid in pos_emp_ids:
                pos_summaries.extend(grouped[eid])
            metrics = compute_metrics(pos_summaries)
            output.append({
                "id": pos.id,
                "name": pos.name,
                "code": None,
                "punctuality": metrics["punctuality"],
                "lates": metrics["lates"],
                "avg_entry": metrics["avg_entry"],
                "critical": metrics["critical"]
            })

    elif entity_type == "schedules":
        sched_query = db.query(Schedule)
        if schedule_id:
            sched_query = sched_query.filter(Schedule.id == schedule_id)
        schedules = sched_query.all()
        
        emp_scheds = db.query(Employee.id, Employee.schedule_id).filter(Employee.is_active == True).all()
        sched_to_emps = defaultdict(list)
        for emp_id, s_id in emp_scheds:
            if s_id:
                sched_to_emps[s_id].append(emp_id)
                
        for sched in schedules:
            sched_emp_ids = sched_to_emps[sched.id]
            sched_summaries = []
            for eid in sched_emp_ids:
                sched_summaries.extend(grouped[eid])
            metrics = compute_metrics(sched_summaries)
            output.append({
                "id": sched.id,
                "name": sched.name,
                "code": None,
                "punctuality": metrics["punctuality"],
                "lates": metrics["lates"],
                "avg_entry": metrics["avg_entry"],
                "critical": metrics["critical"]
            })

    return output


@router.get("/analytics/details")
def get_analytics_details(
    type: str,
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
    employee_ids = [e.id for e in employees]

    if not employee_ids:
        return []

    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.event_time >= df,
        AttendanceRecord.event_time <= dt,
        AttendanceRecord.employee_id.in_(employee_ids)
    ).all()

    entries = [r for r in records if r.event_type == "entry"]

    result = []

    if type == "punctuality":
        emp_stats = {}
        for emp in employees:
            emp_stats[emp.id] = {"emp": emp, "total": 0, "ontime": 0}

        for r in entries:
            if r.employee_id in emp_stats:
                emp_stats[r.employee_id]["total"] += 1
                if not r.is_late:
                    emp_stats[r.employee_id]["ontime"] += 1

        ranking = []
        for eid, stats in emp_stats.items():
            emp = stats["emp"]
            total = stats["total"]
            ontime = stats["ontime"]
            late = total - ontime
            rate = round((ontime / total * 100) if total else 100, 1)
            ranking.append({
                "employee_code": emp.employee_code,
                "full_name": emp.full_name,
                "department": emp.department.name if emp.department else "-",
                "total_entries": total,
                "ontime_entries": ontime,
                "late_entries": late,
                "rate": f"{rate}%",
                "sort_rate": rate
            })
        ranking.sort(key=lambda x: x["sort_rate"])
        return ranking

    elif type == "lates":
        late_entries = [r for r in entries if r.is_late]
        late_entries.sort(key=lambda x: x.event_time, reverse=True)

        employees_by_id = {e.id: e for e in employees}
        for r in late_entries:
            emp = employees_by_id.get(r.employee_id)
            if emp:
                delay_str = "Tarde"
                if emp.schedule and emp.schedule.work_start_time:
                    try:
                        sched_start = emp.schedule.work_start_time
                        sched_dt = datetime.combine(r.event_time.date(), datetime.strptime(sched_start, "%H:%M").time())
                        diff = (r.event_time - sched_dt).total_seconds() / 60.0
                        if diff > 0:
                            delay_str = f"{int(diff)} min tarde"
                    except Exception:
                        pass

                result.append({
                    "employee_code": emp.employee_code,
                    "full_name": emp.full_name,
                    "department": emp.department.name if emp.department else "-",
                    "date": r.event_time.date().isoformat(),
                    "schedule_time": emp.schedule.work_start_time if emp.schedule else "-",
                    "entry_time": r.event_time.strftime("%I:%M %p"),
                    "delay": delay_str
                })
        return result

    elif type == "avg_entry":
        emp_entries = {}
        for emp in employees:
            emp_entries[emp.id] = {"emp": emp, "times": []}

        for r in entries:
            if r.employee_id in emp_entries:
                sec = r.event_time.hour * 3600 + r.event_time.minute * 60 + r.event_time.second
                emp_entries[r.employee_id]["times"].append(sec)

        for eid, data_emp in emp_entries.items():
            emp = data_emp["emp"]
            times = data_emp["times"]
            if times:
                avg_sec = sum(times) // len(times)
                avg_hour = avg_sec // 3600
                avg_min = (avg_sec % 3600) // 60
                avg_str = f"{avg_hour:02d}:{avg_min:02d}"
                avg_dt = datetime.strptime(avg_str, "%H:%M")
                avg_formatted = avg_dt.strftime("%I:%M %p")
            else:
                avg_formatted = "-"

            result.append({
                "employee_code": emp.employee_code,
                "full_name": emp.full_name,
                "department": emp.department.name if emp.department else "-",
                "schedule_time": emp.schedule.work_start_time if emp.schedule else "-",
                "avg_entry": avg_formatted
            })
        return result

    elif type == "critical_day":
        day_names = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
        lates_by_day = {i: 0 for i in range(7)}
        ontime_by_day = {i: 0 for i in range(7)}

        for r in entries:
            w = r.event_time.weekday()
            if r.is_late:
                lates_by_day[w] += 1
            else:
                ontime_by_day[w] += 1

        for i in range(7):
            total = lates_by_day[i] + ontime_by_day[i]
            rate = round((ontime_by_day[i] / total * 100) if total else 100, 1)
            result.append({
                "day_name": day_names[i],
                "total_entries": total,
                "ontime_entries": ontime_by_day[i],
                "late_entries": lates_by_day[i],
                "rate": f"{rate}%"
            })
        return result

    elif type == "hours_worked":
        daily_sums = process_attendance_report(
            db,
            date_from=date_from,
            date_to=date_to,
            search=search,
            department_id=department_id,
            position_id=position_id,
            schedule_id=schedule_id
        )
        emp_hours = {}
        for emp in employees:
            emp_hours[emp.id] = {"emp": emp, "days_worked": 0, "total_hours": 0.0}

        for s in daily_sums:
            eid = s["employee_id"]
            if eid in emp_hours:
                if s["is_present"] and s["hours_worked"] is not None:
                    emp_hours[eid]["days_worked"] += 1
                    emp_hours[eid]["total_hours"] += s["hours_worked"]

        for eid, data_emp in emp_hours.items():
            emp = data_emp["emp"]
            days = data_emp["days_worked"]
            total = round(data_emp["total_hours"], 1)
            avg_daily = round((total / days), 1) if days > 0 else 0.0
            result.append({
                "employee_code": emp.employee_code,
                "full_name": emp.full_name,
                "department": emp.department.name if emp.department else "-",
                "days_worked": days,
                "total_hours": total,
                "avg_daily_hours": avg_daily
            })
        result.sort(key=lambda x: x["total_hours"], reverse=True)
        return result

    elif type == "early_exits":
        daily_sums = process_attendance_report(
            db,
            date_from=date_from,
            date_to=date_to,
            search=search,
            department_id=department_id,
            position_id=position_id,
            schedule_id=schedule_id
        )
        for s in daily_sums:
            if s.get("is_early_exit") and s["is_present"]:
                exit_time_str = "-"
                p1 = s["punches"].get("exit_1")
                p2 = s["punches"].get("exit_2")
                exit_val = p2 or p1
                if exit_val:
                    try:
                        exit_dt = datetime.fromisoformat(exit_val)
                        exit_time_str = exit_dt.strftime("%I:%M %p")
                    except Exception:
                        pass
                
                emp = next((e for e in employees if e.id == s["employee_id"]), None)
                sched_time = "-"
                if emp and emp.schedule:
                    sched_time = emp.schedule.work_end_time or "-"
                
                result.append({
                    "employee_code": s["employee_code"],
                    "full_name": s["employee_name"],
                    "department": s["department"],
                    "date": s["date"],
                    "exit_time": exit_time_str,
                    "schedule_time": sched_time
                })
        result.sort(key=lambda x: x["date"], reverse=True)
        return result

    elif type == "absences":
        daily_sums = process_attendance_report(
            db,
            date_from=date_from,
            date_to=date_to,
            search=search,
            department_id=department_id,
            position_id=position_id,
            schedule_id=schedule_id
        )
        for s in daily_sums:
            if not s["is_present"] and not s["is_off"] and not s["leave_type"]:
                result.append({
                    "employee_code": s["employee_code"],
                    "full_name": s["employee_name"],
                    "department": s["department"],
                    "date": s["date"],
                    "detail": "Inasistencia Injustificada"
                })
        result.sort(key=lambda x: x["date"], reverse=True)
        return result

    return []
