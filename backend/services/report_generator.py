"""
Generador de reportes Excel y PDF.
"""
import io
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from backend.models import AttendanceRecord, Employee


def generate_excel_report(
    db: Session,
    employee_id: Optional[int] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
) -> bytes:
    """Genera un reporte Excel con los registros de asistencia filtrados."""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter

    query = db.query(AttendanceRecord).join(
        Employee, AttendanceRecord.employee_id == Employee.id, isouter=True
    )
    if employee_id:
        query = query.filter(AttendanceRecord.employee_id == employee_id)
    if date_from:
        query = query.filter(AttendanceRecord.event_time >= date_from)
    if date_to:
        query = query.filter(AttendanceRecord.event_time <= date_to)

    records = query.order_by(AttendanceRecord.event_time.desc()).all()

    wb = Workbook()
    ws = wb.active
    ws.title = "Asistencia"

    # Estilos
    header_font = Font(bold=True, color="FFFFFF", size=11)
    header_fill = PatternFill("solid", fgColor="1e3a5f")
    center = Alignment(horizontal="center", vertical="center")
    thin = Side(style="thin", color="CCCCCC")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)

    headers = ["#", "Empleado", "Código", "Departamento", "Fecha", "Hora", "Tipo", "Método Auth", "Tardanza"]
    ws.append(headers)

    for col_idx, _ in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center
        cell.border = border

    # Datos
    for i, r in enumerate(records, 1):
        emp = r.employee
        row = [
            i,
            emp.full_name if emp else "Desconocido",
            emp.employee_code if emp else "-",
            emp.department.name if emp and emp.department else "-",
            r.event_time.strftime("%d/%m/%Y"),
            r.event_time.strftime("%H:%M:%S"),
            "Entrada" if r.event_type == "entry" else "Salida",
            r.auth_method or "-",
            "Sí" if r.is_late else "No",
        ]
        ws.append(row)
        for col_idx in range(1, len(headers) + 1):
            cell = ws.cell(row=i + 1, column=col_idx)
            cell.alignment = center
            cell.border = border
            if r.is_late and col_idx == 9:
                cell.font = Font(color="CC0000", bold=True)

    # Anchos de columna
    col_widths = [5, 28, 12, 20, 14, 12, 10, 16, 10]
    for i, width in enumerate(col_widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = width

    ws.freeze_panes = "A2"

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def generate_pdf_report(
    db: Session,
    employee_id: Optional[int] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
) -> bytes:
    """Genera un reporte PDF con los registros de asistencia."""
    from reportlab.lib.pagesizes import landscape, A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.units import cm

    query = db.query(AttendanceRecord).join(
        Employee, AttendanceRecord.employee_id == Employee.id, isouter=True
    )
    if employee_id:
        query = query.filter(AttendanceRecord.employee_id == employee_id)
    if date_from:
        query = query.filter(AttendanceRecord.event_time >= date_from)
    if date_to:
        query = query.filter(AttendanceRecord.event_time <= date_to)

    records = query.order_by(AttendanceRecord.event_time.desc()).all()

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4), topMargin=2*cm, bottomMargin=2*cm)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("title", parent=styles["Title"], fontSize=16, textColor=colors.HexColor("#1e3a5f"))
    sub_style = ParagraphStyle("sub", parent=styles["Normal"], fontSize=9, textColor=colors.grey)

    from backend.utils import get_local_now
    elements = [
        Paragraph("Reporte de Asistencia", title_style),
        Paragraph(f"Generado: {get_local_now().strftime('%d/%m/%Y %H:%M')} — Total registros: {len(records)}", sub_style),
        Spacer(1, 0.5*cm),
    ]

    data = [["#", "Empleado", "Código", "Departamento", "Fecha", "Hora", "Tipo", "Tardanza"]]
    for i, r in enumerate(records, 1):
        emp = r.employee
        data.append([
            str(i),
            emp.full_name if emp else "Desconocido",
            emp.employee_code if emp else "-",
            emp.department.name if emp and emp.department else "-",
            r.event_time.strftime("%d/%m/%Y"),
            r.event_time.strftime("%H:%M"),
            "Entrada" if r.event_type == "entry" else "Salida",
            "Sí" if r.is_late else "No",
        ])

    table = Table(data, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f4f8")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CCCCCC")),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(table)

    doc.build(elements)
    return buf.getvalue()


def generate_consolidated_excel(
    db: Session,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
) -> bytes:
    """Genera un reporte consolidado en Excel con entrada y salida en la misma fila por día."""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    from collections import defaultdict

    query = db.query(AttendanceRecord).join(
        Employee, AttendanceRecord.employee_id == Employee.id, isouter=True
    )
    if date_from:
        query = query.filter(AttendanceRecord.event_time >= date_from)
    if date_to:
        query = query.filter(AttendanceRecord.event_time <= date_to)

    records = query.order_by(AttendanceRecord.event_time.asc()).all()

    # Agrupar por (empleado, fecha)
    data_map = defaultdict(lambda: {"entries": [], "exits": []})
    employee_cache = {}

    for r in records:
        if not r.employee_id:
            continue
        emp_id = r.employee_id
        if emp_id not in employee_cache:
            employee_cache[emp_id] = r.employee
            
        day = r.event_time.date()
        if r.event_type == "entry":
            data_map[(emp_id, day)]["entries"].append(r)
        else:
            data_map[(emp_id, day)]["exits"].append(r)

    # Ordenar por fecha desc, luego nombre empleado
    sorted_keys = sorted(
        data_map.keys(),
        key=lambda k: (k[1], employee_cache.get(k[0]).last_name if employee_cache.get(k[0]) else ""),
        reverse=True
    )

    wb = Workbook()
    ws = wb.active
    ws.title = "Consolidado Diario"

    # Estilos
    header_font = Font(bold=True, color="FFFFFF", size=11)
    header_fill = PatternFill("solid", fgColor="1e3a5f")
    center = Alignment(horizontal="center", vertical="center")
    thin = Side(style="thin", color="CCCCCC")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)

    headers = [
        "Fecha", "Código", "Empleado", "Departamento", 
        "Hora Entrada", "Hora Salida", "Horario", "Tardanza"
    ]
    ws.append(headers)

    for col_idx, _ in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center
        cell.border = border

    row_num = 2
    for key in sorted_keys:
        emp_id, day = key
        emp = employee_cache.get(emp_id)
        if not emp:
            continue
            
        group = data_map[key]
        
        # Entrada: primer registro de entrada del día
        entry_time_str = "-"
        is_late_str = "No"
        if group["entries"]:
            first_entry = min(group["entries"], key=lambda r: r.event_time)
            entry_time_str = first_entry.event_time.strftime("%H:%M:%S")
            is_late_str = "Sí" if first_entry.is_late else "No"
            
        # Salida: último registro de salida del día
        exit_time_str = "-"
        if group["exits"]:
            last_exit = max(group["exits"], key=lambda r: r.event_time)
            exit_time_str = last_exit.event_time.strftime("%H:%M:%S")

        row = [
            day.strftime("%d/%m/%Y"),
            emp.employee_code,
            emp.full_name,
            emp.department.name if emp.department else "-",
            entry_time_str,
            exit_time_str,
            f"{emp.schedule.name} ({emp.schedule.work_start_time}-{emp.schedule.work_end_time})" if emp.schedule_id and emp.schedule else f"{emp.work_start_time} - {emp.work_end_time}",
            is_late_str
        ]
        ws.append(row)
        for col_idx in range(1, len(headers) + 1):
            cell = ws.cell(row=row_num, column=col_idx)
            cell.alignment = center
            cell.border = border
            if is_late_str == "Sí" and col_idx == 8:
                cell.font = Font(color="CC0000", bold=True)
        
        row_num += 1

    # Anchos de columna
    col_widths = [14, 12, 28, 20, 14, 14, 16, 12]
    for i, width in enumerate(col_widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = width

    ws.freeze_panes = "A2"

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def generate_attendance_excel(summaries: list, granularity: str) -> bytes:
    """Genera un reporte consolidado con horarios y granularidad en Excel."""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter

    wb = Workbook()
    ws = wb.active
    ws.title = f"Reporte {granularity.capitalize()}"

    # Estilos
    header_font = Font(bold=True, color="FFFFFF", size=11)
    header_fill = PatternFill("solid", fgColor="1e3a5f")
    center = Alignment(horizontal="center", vertical="center")
    thin = Side(style="thin", color="CCCCCC")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)

    if granularity == "daily":
        headers = [
            "Empleado", "Código", "Departamento", "Fecha", "Horario",
            "Entrada", "Salida Almuerzo", "Retorno Almuerzo", "Salida", "Estado"
        ]
    else:
        headers = [
            "Empleado", "Código", "Departamento", "Período", "Horario",
            "Asistente", "Incidencias Tardanza", "Punches Incompletos", "Eventos Totales"
        ]

    ws.append(headers)

    for col_idx, _ in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center
        cell.border = border

    row_num = 2
    for s in summaries:
        if granularity == "daily":
            def format_time(iso_str):
                if not iso_str:
                    return "-"
                try:
                    return datetime.fromisoformat(iso_str).strftime("%H:%M")
                except:
                    return "-"

            is_split = s["schedule_type"] == "split"
            entry_1 = format_time(s["punches"]["entry_1"])
            exit_1 = format_time(s["punches"]["exit_1"]) if is_split else "-"
            entry_2 = format_time(s["punches"]["entry_2"]) if is_split else "-"
            exit_2 = format_time(s["punches"]["exit_2"]) if is_split else format_time(s["punches"]["exit_1"])

            status = "OK"
            if not s["is_present"]:
                status = "Ausente"
            elif s["missing_punches"]:
                status = "Incompleto"
            elif s["is_late"]:
                status = "Tardanza"

            try:
                formatted_date = datetime.strptime(s["date"], "%Y-%m-%d").strftime("%d/%m/%Y")
            except:
                formatted_date = s["date"]

            row = [
                s["employee_name"],
                s["employee_code"],
                s["department"],
                formatted_date,
                "Partido" if is_split else ("Continuo" if s["schedule_type"] == "continuous" else "Sin Horario"),
                entry_1,
                exit_1,
                entry_2,
                exit_2,
                status
            ]
        else:
            try:
                p_start = datetime.strptime(s["period_start"], "%Y-%m-%d").strftime("%d/%m/%Y")
                p_end = datetime.strptime(s["period_end"], "%Y-%m-%d").strftime("%d/%m/%Y")
                period_str = f"{p_start} - {p_end}"
            except:
                period_str = f"{s['period_start']} - {s['period_end']}"

            row = [
                s["employee_name"],
                s["employee_code"],
                s["department"],
                period_str,
                "Partido" if s["schedule_type"] == "split" else ("Continuo" if s["schedule_type"] == "continuous" else "Sin Horario"),
                "Sí" if s["is_present"] else "No",
                "Sí" if s["is_late"] else "No",
                "Sí" if s["missing_punches"] else "No",
                s["total_raw_events"]
            ]

        ws.append(row)
        for col_idx in range(1, len(headers) + 1):
            cell = ws.cell(row=row_num, column=col_idx)
            cell.alignment = center
            cell.border = border
            if granularity == "daily" and col_idx == 10:
                if status == "Ausente":
                    cell.font = Font(color="FF3D00", bold=True)
                elif status == "Tardanza":
                    cell.font = Font(color="FFB300", bold=True)
                elif status == "Incompleto":
                    cell.font = Font(color="FFA000", bold=True)
                else:
                    cell.font = Font(color="00E676", bold=True)
            elif granularity != "daily":
                if col_idx == 7 and s["is_late"]:
                    cell.font = Font(color="FFB300", bold=True)
                elif col_idx == 8 and s["missing_punches"]:
                    cell.font = Font(color="FFA000", bold=True)

        row_num += 1

    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 3, 10)

    ws.freeze_panes = "A2"
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def generate_attendance_pdf(summaries: list, granularity: str) -> bytes:
    """Genera un reporte consolidado con horarios y granularidad en PDF."""
    from reportlab.lib.pagesizes import landscape, A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.units import cm
    from backend.utils import get_local_now

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=landscape(A4),
        topMargin=1.5*cm, bottomMargin=1.5*cm, leftMargin=1*cm, rightMargin=1*cm
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("title", parent=styles["Title"], fontSize=16, textColor=colors.HexColor("#1e3a5f"))
    sub_style = ParagraphStyle("sub", parent=styles["Normal"], fontSize=9, textColor=colors.grey)

    elements = [
        Paragraph(f"Reporte de Asistencia - Granularidad: {granularity.capitalize()}", title_style),
        Paragraph(f"Generado: {get_local_now().strftime('%d/%m/%Y %H:%M')} — Total registros: {len(summaries)}", sub_style),
        Spacer(1, 0.5*cm),
    ]

    if granularity == "daily":
        headers = [
            "Empleado", "Código", "Departamento", "Fecha", "Horario",
            "Entrada", "Sal. Alm.", "Ret. Alm.", "Salida", "Estado"
        ]
        data = [headers]
        for s in summaries:
            def format_time(iso_str):
                if not iso_str:
                    return "-"
                try:
                    return datetime.fromisoformat(iso_str).strftime("%H:%M")
                except:
                    return "-"

            is_split = s["schedule_type"] == "split"
            entry_1 = format_time(s["punches"]["entry_1"])
            exit_1 = format_time(s["punches"]["exit_1"]) if is_split else "-"
            entry_2 = format_time(s["punches"]["entry_2"]) if is_split else "-"
            exit_2 = format_time(s["punches"]["exit_2"]) if is_split else format_time(s["punches"]["exit_1"])

            status = "OK"
            if not s["is_present"]:
                status = "Ausente"
            elif s["missing_punches"]:
                status = "Incompleto"
            elif s["is_late"]:
                status = "Tardanza"

            try:
                formatted_date = datetime.strptime(s["date"], "%Y-%m-%d").strftime("%d/%m/%Y")
            except:
                formatted_date = s["date"]

            data.append([
                s["employee_name"],
                s["employee_code"],
                s["department"],
                formatted_date,
                "Partido" if is_split else ("Continuo" if s["schedule_type"] == "continuous" else "Sin Horario"),
                entry_1,
                exit_1,
                entry_2,
                exit_2,
                status
            ])
    else:
        headers = [
            "Empleado", "Código", "Departamento", "Período", "Horario",
            "Presente", "Tardanza", "Incompleto", "Eventos"
        ]
        data = [headers]
        for s in summaries:
            try:
                p_start = datetime.strptime(s["period_start"], "%Y-%m-%d").strftime("%d/%m/%Y")
                p_end = datetime.strptime(s["period_end"], "%Y-%m-%d").strftime("%d/%m/%Y")
                period_str = f"{p_start}\n-{p_end}"
            except:
                period_str = f"{s['period_start']}\n-{s['period_end']}"

            data.append([
                s["employee_name"],
                s["employee_code"],
                s["department"],
                period_str,
                "Partido" if s["schedule_type"] == "split" else ("Continuo" if s["schedule_type"] == "continuous" else "Sin Horario"),
                "Sí" if s["is_present"] else "No",
                "Sí" if s["is_late"] else "No",
                "Sí" if s["missing_punches"] else "No",
                str(s["total_raw_events"])
            ])

    table = Table(data, repeatRows=1)
    
    t_style = TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CCCCCC")),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ])

    for r in range(1, len(data)):
        bg = colors.white if r % 2 == 1 else colors.HexColor("#f0f4f8")
        t_style.add("BACKGROUND", (0, r), (-1, r), bg)
        
        if granularity == "daily":
            status_val = data[r][9]
            if status_val == "Ausente":
                t_style.add("TEXTCOLOR", (9, r), (9, r), colors.HexColor("#FF3D00"))
                t_style.add("FONTNAME", (9, r), (9, r), "Helvetica-Bold")
            elif status_val == "Tardanza":
                t_style.add("TEXTCOLOR", (9, r), (9, r), colors.HexColor("#FFB300"))
                t_style.add("FONTNAME", (9, r), (9, r), "Helvetica-Bold")
            elif status_val == "Incompleto":
                t_style.add("TEXTCOLOR", (9, r), (9, r), colors.HexColor("#FFA000"))
                t_style.add("FONTNAME", (9, r), (9, r), "Helvetica-Bold")
            else:
                t_style.add("TEXTCOLOR", (9, r), (9, r), colors.HexColor("#00E676"))
                t_style.add("FONTNAME", (9, r), (9, r), "Helvetica-Bold")
        else:
            if data[r][6] == "Sí":
                t_style.add("TEXTCOLOR", (6, r), (6, r), colors.HexColor("#FFB300"))
                t_style.add("FONTNAME", (6, r), (6, r), "Helvetica-Bold")
            if data[r][7] == "Sí":
                t_style.add("TEXTCOLOR", (7, r), (7, r), colors.HexColor("#FFA000"))
                t_style.add("FONTNAME", (7, r), (7, r), "Helvetica-Bold")

    table.setStyle(t_style)
    elements.append(table)

    doc.build(elements)
    return buf.getvalue()

