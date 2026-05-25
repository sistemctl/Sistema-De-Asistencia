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
    department_id: Optional[int] = None,
    position_id: Optional[int] = None,
    schedule_id: Optional[int] = None,
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
    if department_id:
        query = query.filter(Employee.department_id == department_id)
    if position_id:
        query = query.filter(Employee.position_id == position_id)
    if schedule_id:
        query = query.filter(Employee.schedule_id == schedule_id)
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
    department_id: Optional[int] = None,
    position_id: Optional[int] = None,
    schedule_id: Optional[int] = None,
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
    if department_id:
        query = query.filter(Employee.department_id == department_id)
    if position_id:
        query = query.filter(Employee.position_id == position_id)
    if schedule_id:
        query = query.filter(Employee.schedule_id == schedule_id)
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
    department_id: Optional[int] = None,
    position_id: Optional[int] = None,
    schedule_id: Optional[int] = None,
) -> bytes:
    """Genera un reporte consolidado en Excel con entrada y salida en la misma fila por día."""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    from collections import defaultdict

    query = db.query(AttendanceRecord).join(
        Employee, AttendanceRecord.employee_id == Employee.id, isouter=True
    )
    if department_id:
        query = query.filter(Employee.department_id == department_id)
    if position_id:
        query = query.filter(Employee.position_id == position_id)
    if schedule_id:
        query = query.filter(Employee.schedule_id == schedule_id)
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


def _get_system_config() -> dict:
    """Obtiene la configuración de marca del sistema desde la base de datos."""
    from backend.database import SessionLocal
    from backend.models import SystemConfig
    db = SessionLocal()
    try:
        cfg = db.query(SystemConfig).first()
        if cfg:
            return {
                "system_name": cfg.system_name,
                "company_name": cfg.company_name,
                "logo_path": cfg.logo_path,
                "primary_color": cfg.primary_color,
                "accent_color": cfg.accent_color,
                "work_days": cfg.work_days,
                "time_format": cfg.time_format,
                "entry_tolerance_minutes": cfg.entry_tolerance_minutes
            }
    except Exception:
        pass
    finally:
        db.close()
    
    return {
        "system_name": "Control de Asistencia",
        "company_name": "Hikvision DS-K1T323MBWX",
        "logo_path": None,
        "primary_color": "#1e3a5f",
        "accent_color": "#00e676",
        "work_days": "1,2,3,4,5",
        "time_format": "24h",
        "entry_tolerance_minutes": 10
    }


def _generate_matplotlib_charts(summaries: list, granularity: str) -> tuple:
    """Genera gráficos de distribución y tendencia utilizando matplotlib y los retorna como BytesIO."""
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    import io
    from datetime import datetime

    cfg = _get_system_config()
    primary_color = cfg.get("primary_color") or "#1e3a5f"
    accent_color = cfg.get("accent_color") or "#00E676"

    # 1. Gráfico Doughnut (Distribución de asistencia)
    ontime = 0
    late = 0
    absent = 0
    incomplete = 0
    for s in summaries:
        if not s.get("is_present", False):
            absent += 1
        elif s.get("missing_punches", False):
            incomplete += 1
        elif s.get("is_late", False):
            late += 1
        else:
            ontime += 1

    labels = []
    sizes = []
    colors_list = []
    if ontime > 0:
        labels.append(f"A tiempo ({ontime})")
        sizes.append(ontime)
        colors_list.append(accent_color)
    if late > 0:
        labels.append(f"Tardanza ({late})")
        sizes.append(late)
        colors_list.append("#FFB300")
    if incomplete > 0:
        labels.append(f"Incompleto ({incomplete})")
        sizes.append(incomplete)
        colors_list.append("#FFA000")
    if absent > 0:
        labels.append(f"Ausente ({absent})")
        sizes.append(absent)
        colors_list.append("#FF3D00")

    if not sizes:
        labels.append("Sin registros")
        sizes.append(1)
        colors_list.append("#E2E8F0")

    fig, ax = plt.subplots(figsize=(2.5, 2.5), dpi=150)
    wedges, texts, autotexts = ax.pie(
        sizes, labels=labels, autopct='%1.0f%%', startangle=90,
        colors=colors_list, textprops=dict(color="#1e293b", size=7, weight="bold"),
        wedgeprops=dict(width=0.35, edgecolor='white')
    )
    plt.setp(autotexts, size=7, weight="bold", color="white")
    ax.set_title("Distribución de Estados", fontsize=9, weight="bold", color=primary_color, pad=10)
    fig.tight_layout()
    
    img_buf_1 = io.BytesIO()
    fig.savefig(img_buf_1, format='png', bbox_inches='tight', transparent=True)
    plt.close(fig)
    img_buf_1.seek(0)

    # 2. Gráfico de Tendencia (Horas de entrada)
    dates = []
    entry_minutes = []
    
    sorted_summaries = sorted(summaries, key=lambda x: x.get("date", ""))
    
    for s in sorted_summaries:
        if s.get("is_present", False) and s.get("punches") and s["punches"].get("entry_1"):
            try:
                dt_obj = datetime.fromisoformat(s["punches"]["entry_1"])
                min_past_midnight = dt_obj.hour * 60 + dt_obj.minute
                d_str = dt_obj.strftime("%d/%m")
                dates.append(d_str)
                entry_minutes.append(min_past_midnight)
            except Exception:
                pass

    dates = dates[-12:]
    entry_minutes = entry_minutes[-12:]

    fig2, ax2 = plt.subplots(figsize=(4.2, 2.5), dpi=150)
    if entry_minutes and granularity == "daily":
        ax2.plot(dates, entry_minutes, marker='o', color=primary_color, linewidth=2, markersize=4, label='Entrada')
        ax2.fill_between(dates, entry_minutes, color=primary_color, alpha=0.08)
        
        def format_min_to_hm(x, pos):
            h = int(x // 60)
            m = int(x % 60)
            return f"{h:02d}:{m:02d}"
        
        from matplotlib.ticker import FuncFormatter
        ax2.yaxis.set_major_formatter(FuncFormatter(format_min_to_hm))
        ax2.axhline(y=480, color='#FF3D00', linestyle='--', linewidth=1, alpha=0.7, label='Límite (08:00)')
    else:
        msg = 'Tendencia disponible en vista Diaria' if granularity != "daily" else 'Sin entradas registradas'
        ax2.text(0.5, 0.5, msg, horizontalalignment='center', verticalalignment='center', transform=ax2.transAxes, color="#64748b", fontsize=8)

    ax2.set_title("Puntualidad en Entradas (Últimos 12 Días)", fontsize=9, weight="bold", color=primary_color, pad=10)
    ax2.tick_params(axis='both', which='major', labelsize=7, labelcolor="#475569")
    for label in ax2.get_xticklabels():
        label.set_rotation(30)
    ax2.grid(True, linestyle=':', alpha=0.3, color="#94a3b8")
    ax2.legend(fontsize=6.5, loc='upper right', framealpha=0.8)
    for spine in ['top', 'right']:
        ax2.spines[spine].set_visible(False)
    ax2.spines['left'].set_color('#cbd5e1')
    ax2.spines['bottom'].set_color('#cbd5e1')
    
    fig2.tight_layout()

    img_buf_2 = io.BytesIO()
    fig2.savefig(img_buf_2, format='png', bbox_inches='tight', transparent=True)
    plt.close(fig2)
    img_buf_2.seek(0)

    return img_buf_1, img_buf_2


def _generate_individual_pdf(summaries: list, granularity: str) -> bytes:
    """Genera un reporte PDF con diseño ejecutivo vertical para un empleado individual."""
    import os
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
    from reportlab.lib.units import cm
    from backend.utils import get_local_now

    cfg = _get_system_config()
    primary_color_hex = cfg.get("primary_color") or "#1e3a5f"
    accent_color_hex = cfg.get("accent_color") or "#00e676"
    
    # Intenta obtener los dias laborables especificos del empleado de la BD
    work_days = [int(x) for x in cfg.get("work_days", "1,2,3,4,5").split(",")]
    first_record = summaries[0]
    
    from backend.database import SessionLocal
    from backend.models import Employee
    db = SessionLocal()
    try:
        emp_id = first_record.get("employee_id")
        if emp_id:
            emp = db.query(Employee).filter(Employee.id == emp_id).first()
            if emp and emp.schedule and emp.schedule.work_days:
                work_days = [int(x) for x in emp.schedule.work_days.split(",")]
    except Exception as e:
        print(f"Error cargando dias laborales del empleado en reporte PDF: {e}")
    finally:
        db.close()

    primary_color = colors.HexColor(primary_color_hex)
    accent_color = colors.HexColor(accent_color_hex)

    employee_name = first_record.get("employee_name", "Empleado")
    employee_code = first_record.get("employee_code", "-")
    department = first_record.get("department", "-")

    # Calcular KPIs
    total_days = len(summaries)
    present_days = sum(1 for s in summaries if s.get("is_present", False))
    
    # Calcular ausencias únicamente en días laborables configurados
    absent_days = 0
    from datetime import datetime as dt_parser
    for s in summaries:
        if not s.get("is_present", False):
            try:
                d_obj = dt_parser.strptime(s["date"], "%Y-%m-%d")
                if (d_obj.weekday() + 1) in work_days:
                    absent_days += 1
            except Exception:
                absent_days += 1

    late_days = sum(1 for s in summaries if s.get("is_present", False) and s.get("is_late", False))
    incomplete_days = sum(1 for s in summaries if s.get("is_present", False) and s.get("missing_punches", False))
    
    punctuality_rate = "100%"
    if present_days > 0:
        ontime_days = present_days - late_days
        punctuality_rate = f"{round((ontime_days / present_days) * 100, 1)}%"

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        topMargin=1.2*cm, bottomMargin=1.2*cm, leftMargin=1.2*cm, rightMargin=1.2*cm
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        "BannerTitle",
        parent=styles["Title"],
        fontSize=14,
        leading=16,
        textColor=colors.white,
        alignment=0,
        fontName="Helvetica-Bold"
    )
    
    banner_meta_style = ParagraphStyle(
        "BannerMeta",
        parent=styles["Normal"],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#cbd5e1"),
        alignment=0
    )
    
    section_title = ParagraphStyle(
        "SecTitle",
        parent=styles["Heading2"],
        fontSize=10,
        leading=13,
        textColor=primary_color,
        fontName="Helvetica-Bold",
        spaceBefore=12,
        spaceAfter=6
    )

    kpi_num_style = ParagraphStyle(
        "KpiNum",
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=17,
        textColor=primary_color,
        alignment=1
    )

    kpi_lbl_style = ParagraphStyle(
        "KpiLbl",
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#475569"),
        alignment=1
    )

    cell_style = ParagraphStyle(
        "CellNormal",
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#334155"),
        alignment=1
    )

    cell_bold_style = ParagraphStyle(
        "CellBold",
        parent=cell_style,
        fontName="Helvetica-Bold"
    )

    elements = []

    # 1. HEADER BANNER
    left_cell_elements = []
    has_logo = False
    if cfg.get("logo_path"):
        try:
            clean_path = cfg["logo_path"].split('?')[0]
            if clean_path.startswith('/'):
                clean_path = clean_path[1:]
            local_path = os.path.abspath(clean_path)
            if os.path.exists(local_path):
                logo_img = Image(local_path, height=1.1*cm, width=4.0*cm, kind='proportional')
                logo_img.hAlign = 'LEFT'
                left_cell_elements.append(logo_img)
                left_cell_elements.append(Spacer(1, 4))
                has_logo = True
        except Exception:
            pass

    sys_title_style = ParagraphStyle(
        "SysTitle",
        parent=title_style,
        fontSize=12 if has_logo else 15,
        leading=14 if has_logo else 17
    )
    left_cell_elements.append(Paragraph(cfg.get("system_name", "Control de Asistencia").upper(), sys_title_style))

    banner_data = [
        [
            left_cell_elements,
            Paragraph(f"<b>Empresa:</b> {cfg.get('company_name')}<br/><b>Empleado:</b> {employee_name}<br/><b>Código:</b> {employee_code}<br/><b>Área:</b> {department}", banner_meta_style)
        ]
    ]
    banner_table = Table(banner_data, colWidths=[9.5*cm, 9.1*cm])
    banner_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), primary_color),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING", (0, 0), (-1, -1), 16),
        ("RIGHTPADDING", (0, 0), (-1, -1), 16),
        ("BOTTOMBORDER", (0, 0), (-1, -1), 3, accent_color),
    ]))
    elements.append(banner_table)
    elements.append(Spacer(1, 0.3*cm))

    # Info de generación
    gen_time_str = get_local_now().strftime('%d/%m/%Y %H:%M')
    elements.append(Paragraph(f"<font color='#64748b'>Reporte generado en: {gen_time_str} — Periodo de análisis: {total_days} días analizados (Ausencias calculadas sobre días laborales laborados)</font>", banner_meta_style))
    elements.append(Spacer(1, 0.4*cm))

    # 2. KPIs METRICS CARDS
    kpis_data = [
        [
            Paragraph(punctuality_rate, kpi_num_style),
            Paragraph(str(present_days), kpi_num_style),
            Paragraph(str(absent_days), kpi_num_style),
            Paragraph(str(incomplete_days), kpi_num_style)
        ],
        [
            Paragraph("Tasa Puntualidad", kpi_lbl_style),
            Paragraph("Días Asistidos", kpi_lbl_style),
            Paragraph("Ausencias (Laborales)", kpi_lbl_style),
            Paragraph("Punches Incompletos", kpi_lbl_style)
        ]
    ]
    kpi_table = Table(kpis_data, colWidths=[4.65*cm, 4.65*cm, 4.65*cm, 4.65*cm])
    kpi_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, 0), 10),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 2),
        ("TOPPADDING", (0, 1), (-1, 1), 2),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 10),
    ]))
    elements.append(kpi_table)

    # 3. CHARTS CONTAINER
    try:
        chart_doughnut_buf, chart_trend_buf = _generate_matplotlib_charts(summaries, granularity)
        img_doughnut = Image(chart_doughnut_buf, width=7.0*cm, height=7.0*cm)
        img_trend = Image(chart_trend_buf, width=10.6*cm, height=6.2*cm)
        
        charts_data = [[img_doughnut, img_trend]]
        charts_table = Table(charts_data, colWidths=[7.5*cm, 11.1*cm])
        charts_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]))
        
        elements.append(Paragraph("ANÁLISIS GRÁFICO DE RENDIMIENTO", section_title))
        elements.append(charts_table)
    except Exception as e:
        elements.append(Paragraph(f"<font color='red'>No se pudieron cargar los gráficos: {str(e)}</font>", banner_meta_style))

    # 4. DETAILED DAILY ATTENDANCE TABLE
    elements.append(Paragraph("HISTORIAL DETALLADO DE ASISTENCIA", section_title))
    
    if granularity == "daily":
        headers = [
            Paragraph("<b>Fecha</b>", ParagraphStyle("H", parent=cell_bold_style, textColor=colors.white)),
            Paragraph("<b>Horario</b>", ParagraphStyle("H", parent=cell_bold_style, textColor=colors.white)),
            Paragraph("<b>Entrada</b>", ParagraphStyle("H", parent=cell_bold_style, textColor=colors.white)),
            Paragraph("<b>Sal. Alm.</b>", ParagraphStyle("H", parent=cell_bold_style, textColor=colors.white)),
            Paragraph("<b>Ret. Alm.</b>", ParagraphStyle("H", parent=cell_bold_style, textColor=colors.white)),
            Paragraph("<b>Salida</b>", ParagraphStyle("H", parent=cell_bold_style, textColor=colors.white)),
            Paragraph("<b>Estado</b>", ParagraphStyle("H", parent=cell_bold_style, textColor=colors.white))
        ]
        data = [headers]
        col_widths = [2.6*cm, 2.5*cm, 2.5*cm, 2.5*cm, 2.5*cm, 2.5*cm, 3.5*cm]

        for s in summaries:
            def format_time(iso_str):
                if not iso_str:
                    return "-"
                try:
                    return datetime.fromisoformat(iso_str).strftime("%H:%M")
                except:
                    return "-"

            is_split = s.get("schedule_type") == "split"
            entry_1 = format_time(s["punches"].get("entry_1"))
            exit_1 = format_time(s["punches"].get("exit_1")) if is_split else "-"
            entry_2 = format_time(s["punches"].get("entry_2")) if is_split else "-"
            exit_2 = format_time(s["punches"].get("exit_2")) if is_split else format_time(s["punches"].get("exit_1"))

            status_text = "OK"
            status_color = "#00E676"
            if not s.get("is_present", False):
                is_workday = True
                try:
                    d_obj = datetime.strptime(s["date"], "%Y-%m-%d")
                    if (d_obj.weekday() + 1) not in work_days:
                        is_workday = False
                except Exception:
                    pass
                
                if is_workday:
                    status_text = "Ausente"
                    status_color = "#FF3D00"
                else:
                    status_text = "Descanso"
                    status_color = "#64748b" # gris neutro
            elif s.get("missing_punches", False):
                status_text = "Incompleto"
                status_color = "#FFA000"
            elif s.get("is_late", False):
                status_text = "Tardanza"
                status_color = "#FFB300"

            status_paragraph = Paragraph(f"<b><font color='{status_color}'>{status_text}</font></b>", cell_bold_style)

            try:
                formatted_date = datetime.strptime(s["date"], "%Y-%m-%d").strftime("%d/%m/%Y")
            except:
                formatted_date = s.get("date", "")

            data.append([
                Paragraph(formatted_date, cell_style),
                Paragraph("Partido" if is_split else ("Continuo" if s.get("schedule_type") == "continuous" else "Sin Horario"), cell_style),
                Paragraph(entry_1, cell_style),
                Paragraph(exit_1, cell_style),
                Paragraph(entry_2, cell_style),
                Paragraph(exit_2, cell_style),
                status_paragraph
            ])
    else:
        headers = [
            Paragraph("<b>Período</b>", ParagraphStyle("H", parent=cell_bold_style, textColor=colors.white)),
            Paragraph("<b>Horario</b>", ParagraphStyle("H", parent=cell_bold_style, textColor=colors.white)),
            Paragraph("<b>Asistió</b>", ParagraphStyle("H", parent=cell_bold_style, textColor=colors.white)),
            Paragraph("<b>Tardanza</b>", ParagraphStyle("H", parent=cell_bold_style, textColor=colors.white)),
            Paragraph("<b>Incompleto</b>", ParagraphStyle("H", parent=cell_bold_style, textColor=colors.white)),
            Paragraph("<b>Eventos</b>", ParagraphStyle("H", parent=cell_bold_style, textColor=colors.white))
        ]
        data = [headers]
        col_widths = [3.6*cm, 3.0*cm, 3.0*cm, 3.0*cm, 3.0*cm, 3.0*cm]

        for s in summaries:
            try:
                p_start = datetime.strptime(s["period_start"], "%Y-%m-%d").strftime("%d/%m/%Y")
                p_end = datetime.strptime(s["period_end"], "%Y-%m-%d").strftime("%d/%m/%Y")
                period_str = f"{p_start} - {p_end}"
            except:
                period_str = f"{s.get('period_start', '')} - {s.get('period_end', '')}"

            row = [
                Paragraph(period_str, cell_style),
                Paragraph("Partido" if s.get("schedule_type") == "split" else ("Continuo" if s.get("schedule_type") == "continuous" else "Sin Horario"), cell_style),
                Paragraph("Sí" if s.get("is_present") else "No", ParagraphStyle("B", parent=cell_bold_style, textColor=colors.HexColor("#00E676") if s.get("is_present") else colors.HexColor("#FF3D00"))),
                Paragraph("Sí" if s.get("is_late") else "No", ParagraphStyle("B", parent=cell_bold_style, textColor=colors.HexColor("#FFB300") if s.get("is_late") else colors.HexColor("#00E676"))),
                Paragraph("Sí" if s.get("missing_punches") else "No", ParagraphStyle("B", parent=cell_bold_style, textColor=colors.HexColor("#FFA000") if s.get("missing_punches") else colors.HexColor("#00E676"))),
                Paragraph(str(s.get("total_raw_events", 0)), cell_style)
            ]
            data.append(row)

    table = Table(data, colWidths=col_widths, repeatRows=1)
    t_style = TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), primary_color),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ])

    for r in range(1, len(data)):
        bg = colors.white if r % 2 == 1 else colors.HexColor("#f8fafc")
        t_style.add("BACKGROUND", (0, r), (-1, r), bg)

    table.setStyle(t_style)
    elements.append(table)

    doc.build(elements)
    return buf.getvalue()



def generate_attendance_pdf(summaries: list, granularity: str) -> bytes:
    """Genera un reporte consolidado con horarios y granularidad en PDF."""
    # Detectar si es un reporte individual de empleado
    is_single_employee = False
    if summaries:
        emp_ids = {s.get("employee_id") for s in summaries if s.get("employee_id") is not None}
        if len(emp_ids) == 1:
            is_single_employee = True
        else:
            emp_codes = {s.get("employee_code") for s in summaries if s.get("employee_code") is not None}
            if len(emp_codes) == 1:
                is_single_employee = True

    if is_single_employee:
        return _generate_individual_pdf(summaries, granularity)

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


