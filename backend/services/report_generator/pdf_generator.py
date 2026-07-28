"""
Generador de reportes PDF utilizando ReportLab.
"""
import logging

logger = logging.getLogger(__name__)

import io
import os
from datetime import datetime
from typing import Optional
from collections import defaultdict
from sqlalchemy.orm import Session, joinedload

from reportlab.platypus import Flowable, SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Image
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from backend.models import AttendanceRecord, Employee, EmployeeDailySchedule
from backend.utils import get_local_now
from .chart_generator import _generate_matplotlib_charts, _get_system_config

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super().showPage()
        super().save()

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(0.8*cm, 1.2*cm, 20.2*cm, 1.2*cm)
        
        cfg = _get_system_config()
        system_text = f"{cfg.get('system_name')} — {cfg.get('company_name')}"
        self.drawString(0.8*cm, 0.8*cm, system_text[:80])
        
        page_text = f"Página {self._pageNumber} de {page_count}"
        self.drawRightString(20.2*cm, 0.8*cm, page_text)
        self.restoreState()

class CircularAvatar(Flowable):
    def __init__(self, path_or_initials, size):
        Flowable.__init__(self)
        self.path = path_or_initials if (path_or_initials and os.path.exists(path_or_initials)) else None
        self.size = size
        self.width = size
        self.height = size

    def draw(self):
        self.canv.saveState()
        path = self.canv.beginPath()
        path.circle(self.size / 2, self.size / 2, self.size / 2)
        self.canv.clipPath(path, stroke=0, fill=0)
        
        if self.path:
            self.canv.drawImage(self.path, 0, 0, width=self.size, height=self.size)
        else:
            self.canv.setFillColor(colors.HexColor("#cbd5e1"))
            self.canv.circle(self.size / 2, self.size / 2, self.size / 2, fill=1, stroke=0)
            self.canv.setFillColor(colors.white)
            self.canv.circle(self.size / 2, self.size * 0.62, self.size * 0.18, fill=1, stroke=0)
            self.canv.circle(self.size / 2, self.size * 0.15, self.size * 0.32, fill=1, stroke=0)
            
        self.canv.restoreState()

def _get_employee_flowables(
    summaries: list,
    granularity: str,
    schedules_map: dict = None,
    photos_map: dict = None,
    daily_schedules_by_employee: dict = None,
    columns: Optional[list] = None
) -> list:
    """Genera la lista de flowables para un empleado individual, utilizando cachés para resolver N+1 queries."""
    cfg = _get_system_config()
    primary_color_hex = cfg.get("primary_color") or "#1e3a5f"
    accent_color_hex = cfg.get("accent_color") or "#00e676"
    
    first_record = summaries[0] if summaries else {}
    emp_id = first_record.get("employee_id")
    
    work_days = None
    if schedules_map is not None and emp_id in schedules_map:
        work_days = schedules_map[emp_id]
        
    photo_path = None
    if photos_map is not None and emp_id in photos_map:
        photo_path = photos_map[emp_id]
    
    daily_schedules_map = {}
    if daily_schedules_by_employee is not None and emp_id in daily_schedules_by_employee:
        daily_schedules_map = daily_schedules_by_employee[emp_id]
        
    # Fallback si no viene pre-cargado
    if emp_id and (work_days is None or photo_path is None or not daily_schedules_map):
        from backend.database import SessionLocal
        db = SessionLocal()
        try:
            emp = db.query(Employee).options(joinedload(Employee.schedule)).filter(Employee.id == emp_id).first()
            if emp:
                if photo_path is None:
                    photo_path = emp.photo_path
                if work_days is None and emp.schedule and emp.schedule.work_days:
                    work_days = [int(x) for x in emp.schedule.work_days.split(",")]
            
            if not daily_schedules_map and summaries:
                dates = []
                for s in summaries:
                    try:
                        dates.append(datetime.strptime(s["date"], "%Y-%m-%d").date())
                    except:
                        pass
                if dates:
                    min_date = min(dates)
                    max_date = max(dates)
                    dailies = db.query(EmployeeDailySchedule).filter(
                        EmployeeDailySchedule.employee_id == emp_id,
                        EmployeeDailySchedule.date >= min_date,
                        EmployeeDailySchedule.date <= max_date
                    ).all()
                    for d in dailies:
                        daily_schedules_map[d.date] = d
        except Exception as e:
            logger.error(f"Error cargando datos de empleado en flowables PDF: {e}")
        finally:
            db.close()
            
    if work_days is None:
        work_days = [int(x) for x in cfg.get("work_days", "1,2,3,4,5").split(",")]

    primary_color = colors.HexColor(primary_color_hex)
    accent_color = colors.HexColor(accent_color_hex)

    employee_name = first_record.get("employee_name", "Empleado")
    employee_code = first_record.get("employee_code", "-")
    department = first_record.get("department", "-")

    # Calcular KPIs
    total_days = len(summaries)
    present_days = sum(1 for s in summaries if s.get("is_present", False))
    
    absent_days = 0
    for s in summaries:
        if not s.get("is_present", False):
            try:
                d_obj = datetime.strptime(s["date"], "%Y-%m-%d")
                d_date = d_obj.date()
                if d_date in daily_schedules_map:
                    is_workday = not daily_schedules_map[d_date].is_off
                else:
                    is_workday = (d_obj.weekday() + 1) in work_days
            except Exception:
                is_workday = True
            
            if is_workday:
                absent_days += 1

    late_days = sum(1 for s in summaries if s.get("is_present", False) and s.get("is_late", False))
    incomplete_days = sum(1 for s in summaries if s.get("is_present", False) and s.get("missing_punches", False))
    
    punctuality_rate = "100%"
    if present_days > 0:
        ontime_days = present_days - late_days
        punctuality_rate = f"{round((ontime_days / present_days) * 100, 1)}%"

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        "BannerTitle_" + str(employee_code),
        parent=styles["Title"],
        fontSize=14,
        leading=16,
        textColor=colors.white,
        alignment=0,
        fontName="Helvetica-Bold"
    )
    
    banner_meta_style = ParagraphStyle(
        "BannerMeta_" + str(employee_code),
        parent=styles["Normal"],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#cbd5e1"),
        alignment=0
    )
    
    section_title = ParagraphStyle(
        "SecTitle_" + str(employee_code),
        parent=styles["Heading2"],
        fontSize=10,
        leading=13,
        textColor=primary_color,
        fontName="Helvetica-Bold",
        spaceBefore=6,
        spaceAfter=3
    )

    kpi_num_style = ParagraphStyle(
        "KpiNum_" + str(employee_code),
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=15,
        textColor=primary_color,
        alignment=1
    )

    kpi_lbl_style = ParagraphStyle(
        "KpiLbl_" + str(employee_code),
        fontName="Helvetica",
        fontSize=7.5,
        leading=9,
        textColor=colors.HexColor("#475569"),
        alignment=1
    )

    cell_style = ParagraphStyle(
        "CellNormal_" + str(employee_code),
        fontName="Helvetica",
        fontSize=7.0,
        leading=8.5,
        textColor=colors.HexColor("#334155"),
        alignment=1
    )

    cell_bold_style = ParagraphStyle(
        "CellBold_" + str(employee_code),
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
            if not os.path.exists(local_path) and not clean_path.startswith("uploads/"):
                local_path = os.path.abspath(os.path.join("uploads", clean_path))
                
            if os.path.exists(local_path):
                logo_img = CircularAvatar(local_path, 1.3*cm)
                logo_img.hAlign = 'LEFT'
                left_cell_elements.append(logo_img)
                left_cell_elements.append(Spacer(1, 4))
                has_logo = True
        except Exception:
            pass

    sys_title_style = ParagraphStyle(
        "SysTitle_" + str(employee_code),
        parent=title_style,
        fontSize=12 if has_logo else 15,
        leading=14 if has_logo else 17
    )
    left_cell_elements.append(Paragraph(cfg.get("system_name", "Control de Asistencia").upper(), sys_title_style))

    photo_img = None
    if photo_path:
        try:
            clean_photo_path = photo_path.split('?')[0]
            if clean_photo_path.startswith('/'):
                clean_photo_path = clean_photo_path[1:]
            local_photo_path = os.path.abspath(clean_photo_path)
            if not os.path.exists(local_photo_path) and not clean_photo_path.startswith("uploads/"):
                local_photo_path = os.path.abspath(os.path.join("uploads", clean_photo_path))
                
            if os.path.exists(local_photo_path):
                photo_img = CircularAvatar(local_photo_path, 2.2*cm)
        except Exception as pe:
            logger.error(f"Error loading photo for PDF: {pe}")
            
    if not photo_img:
        photo_img = CircularAvatar(None, 2.2*cm)
        
    photo_img.hAlign = 'RIGHT'

    banner_data = [
        [
            left_cell_elements,
            Paragraph(f"<b>Empresa:</b> {cfg.get('company_name')}<br/><b>Empleado:</b> {employee_name}<br/><b>Código:</b> {employee_code}<br/><b>Área:</b> {department}", banner_meta_style),
            photo_img
        ]
    ]
    banner_table = Table(banner_data, colWidths=[7.8*cm, 8.5*cm, 2.5*cm])
    banner_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), primary_color),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (2, 0), (2, 0), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING", (0, 0), (-1, -1), 16),
        ("RIGHTPADDING", (0, 0), (-1, -1), 16),
        ("BOTTOMBORDER", (0, 0), (-1, -1), 3, accent_color),
    ]))
    elements.append(banner_table)
    elements.append(Spacer(1, 0.15*cm))

    gen_time_str = get_local_now().strftime('%d/%m/%Y %H:%M')
    elements.append(Paragraph(f"<font color='#64748b'>Reporte generado en: {gen_time_str} — Periodo de análisis: {total_days} días analizados (Ausencias calculadas sobre días laborales laborados)</font>", banner_meta_style))
    elements.append(Spacer(1, 0.2*cm))

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
    kpi_table = Table(kpis_data, colWidths=[4.7*cm, 4.7*cm, 4.7*cm, 4.7*cm])
    kpi_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fafafa")),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
        ("LINEABOVE", (0, 0), (-1, 0), 2.5, primary_color),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 2),
        ("TOPPADDING", (0, 1), (-1, 1), 2),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 8),
    ]))
    elements.append(kpi_table)

    # 3. CHARTS CONTAINER
    try:
        chart_doughnut_buf, chart_trend_buf = _generate_matplotlib_charts(summaries, granularity)
        img_doughnut = Image(chart_doughnut_buf, width=3.8*cm, height=3.8*cm)
        img_trend = Image(chart_trend_buf, width=7.6*cm, height=3.8*cm)
        
        charts_data = [[img_doughnut, img_trend]]
        charts_table = Table(charts_data, colWidths=[4.3*cm, 14.5*cm])
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
        all_cols = [
            ("period", "Fecha", 2.6*cm),
            ("schedule", "Horario", 2.5*cm),
            ("punches", "Entrada", 2.5*cm),
            ("punches", "Sal. Alm.", 2.5*cm),
            ("punches", "Ret. Alm.", 2.5*cm),
            ("punches", "Salida", 2.5*cm),
            ("status", "Estado", 3.5*cm)
        ]
    else:
        all_cols = [
            ("period", "Período", 3.6*cm),
            ("schedule", "Horario", 3.0*cm),
            ("status", "Asistió", 3.0*cm),
            ("status", "Tardanza", 3.0*cm),
            ("status", "Incompleto", 3.0*cm),
            ("punches", "Eventos", 3.0*cm)
        ]

    active_cols = []
    for col_key, col_header, col_w in all_cols:
        if columns is None or col_key in columns:
            active_cols.append((col_key, col_header, col_w))

    headers = [Paragraph(f"<b>{h}</b>", ParagraphStyle("H_" + h.replace(".", "").replace(" ", "_") + "_" + str(employee_code), parent=cell_bold_style, textColor=colors.white)) for _, h, _ in active_cols]
    data = [headers]
    
    total_w = sum(w for _, _, w in active_cols)
    if total_w > 0:
        scale = (18.8 * cm) / total_w
        col_widths = [w * scale for _, _, w in active_cols]
    else:
        col_widths = []

    if granularity == "daily":
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

            leave_map = {
                "vacation": ("Vacaciones", "#0f766e"),
                "medical": ("Incapacidad", "#7c3aed"),
                "paid_leave": ("Licencia Rem.", "#2563eb"),
                "unpaid_leave": ("Licencia No Rem.", "#4f46e5"),
                "suspension": ("Suspensión", "#b91c1c")
            }
            status_text = "PRESENTE"
            status_color = "#166534"
            if s.get("justification"):
                status_color = "#7c3aed"
                if s["justification"]["override_status"] == "present":
                    status_text = "Justificado"
                else:
                    status_text = "A Tiempo (Just.)"
            elif s.get("leave_type") and s["leave_type"] in leave_map:
                status_text, status_color = leave_map[s["leave_type"]]
            elif not s.get("is_present", False):
                if s.get("is_holiday"):
                    status_text = "Festivo"
                    status_color = "#6d28d9"
                else:
                    is_workday = True
                    try:
                        d_obj = datetime.strptime(s["date"], "%Y-%m-%d")
                        d_date = d_obj.date()
                        if d_date in daily_schedules_map:
                            is_workday = not daily_schedules_map[d_date].is_off
                        else:
                            is_workday = (d_obj.weekday() + 1) in work_days
                    except Exception:
                        pass
                    
                    if is_workday:
                        status_text = "Ausente"
                        status_color = "#991b1b"
                    else:
                        status_text = "Descanso"
                        status_color = "#475569"

            status_paragraph = Paragraph(f"<b><font color='{status_color}'>{status_text}</font></b>", cell_bold_style)

            try:
                formatted_date = datetime.strptime(s["date"], "%Y-%m-%d").strftime("%d/%m/%Y")
            except:
                formatted_date = s.get("date", "")

            full_row_data = {
                "period": Paragraph(formatted_date, cell_style),
                "schedule": Paragraph("Partido" if is_split else ("Continuo" if s.get("schedule_type") == "continuous" else ("Flexible" if s.get("schedule_type") == "flexible" else "Sin Horario")), cell_style),
                "punches_e1": Paragraph(entry_1, cell_style),
                "punches_x1": Paragraph(exit_1, cell_style),
                "punches_e2": Paragraph(entry_2, cell_style),
                "punches_x2": Paragraph(exit_2, cell_style),
                "status": status_paragraph
            }
            row = []
            for col_key, col_header, _ in active_cols:
                if col_header == "Entrada":
                    row.append(full_row_data["punches_e1"])
                elif col_header == "Sal. Alm.":
                    row.append(full_row_data["punches_x1"])
                elif col_header == "Ret. Alm.":
                    row.append(full_row_data["punches_e2"])
                elif col_header == "Salida":
                    row.append(full_row_data["punches_x2"])
                else:
                    row.append(full_row_data[col_key])
            data.append(row)
    else:
        for s in summaries:
            try:
                p_start = datetime.strptime(s["period_start"], "%Y-%m-%d").strftime("%d/%m/%Y")
                p_end = datetime.strptime(s["period_end"], "%Y-%m-%d").strftime("%d/%m/%Y")
                period_str = f"{p_start} - {p_end}"
            except:
                period_str = f"{s.get('period_start', '')} - {s.get('period_end', '')}"

            full_row_data = {
                "period": Paragraph(period_str, cell_style),
                "schedule": Paragraph("Partido" if s.get("schedule_type") == "split" else ("Continuo" if s.get("schedule_type") == "continuous" else ("Flexible" if s.get("schedule_type") == "flexible" else "Sin Horario")), cell_style),
                "status_p": Paragraph("Sí" if s.get("is_present") else "No", ParagraphStyle("B_P_" + str(employee_code), parent=cell_bold_style, textColor=colors.HexColor("#00E676") if s.get("is_present") else colors.HexColor("#FF3D00"))),
                "status_l": Paragraph("Sí" if s.get("is_late") else "No", ParagraphStyle("B_T_" + str(employee_code), parent=cell_bold_style, textColor=colors.HexColor("#FFB300") if s.get("is_late") else colors.HexColor("#00E676"))),
                "status_m": Paragraph("Sí" if s.get("missing_punches") else "No", ParagraphStyle("B_I_" + str(employee_code), parent=cell_bold_style, textColor=colors.HexColor("#FFA000") if s.get("missing_punches") else colors.HexColor("#00E676"))),
                "punches": Paragraph(str(s.get("total_raw_events", 0)), cell_style)
            }
            row = []
            for col_key, col_header, _ in active_cols:
                if col_header == "Asistió":
                    row.append(full_row_data["status_p"])
                elif col_header == "Tardanza":
                    row.append(full_row_data["status_l"])
                elif col_header == "Incompleto":
                    row.append(full_row_data["status_m"])
                else:
                    row.append(full_row_data[col_key])
            data.append(row)

    if col_widths:
        table = Table(data, colWidths=col_widths, repeatRows=1)
        t_style = TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), primary_color),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ])

        if granularity == "daily":
            for r in range(1, len(data)):
                s = summaries[r - 1]
                is_present = s.get("is_present", False)
                missing = s.get("missing_punches", False)
                is_late = s.get("is_late", False)
                
                if not is_present:
                    is_workday = True
                    try:
                        d_obj = datetime.strptime(s["date"], "%Y-%m-%d")
                        d_date = d_obj.date()
                        if d_date in daily_schedules_map:
                            is_workday = not daily_schedules_map[d_date].is_off
                        else:
                            is_workday = (d_obj.weekday() + 1) in work_days
                    except Exception:
                        pass
                    
                    if is_workday:
                        bg_color = colors.HexColor("#fee2e2")
                    else:
                        bg_color = colors.HexColor("#f1f5f9")
                elif missing:
                    bg_color = colors.HexColor("#fef9c3")
                elif is_late:
                    bg_color = colors.HexColor("#fef3c7")
                else:
                    bg_color = colors.HexColor("#dcfce7")
                    
                t_style.add("BACKGROUND", (0, r), (-1, r), bg_color)
        else:
            for r in range(1, len(data)):
                bg = colors.white if r % 2 == 1 else colors.HexColor("#f8fafc")
                t_style.add("BACKGROUND", (0, r), (-1, r), bg)
                
                s = summaries[r - 1]
                for col_idx, (col_key, col_header, _) in enumerate(active_cols):
                    if col_header == "Asistió" and not s.get("is_present"):
                        t_style.add("BACKGROUND", (col_idx, r), (col_idx, r), colors.HexColor("#fee2e2"))
                    elif col_header == "Tardanza" and s.get("is_late"):
                        t_style.add("BACKGROUND", (col_idx, r), (col_idx, r), colors.HexColor("#fef3c7"))
                    elif col_header == "Incompleto" and s.get("missing_punches"):
                        t_style.add("BACKGROUND", (col_idx, r), (col_idx, r), colors.HexColor("#fef9c3"))

        table.setStyle(t_style)
        elements.append(table)

    return elements

def generate_pdf_report(
    db: Session,
    employee_id: Optional[int] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    department_id: Optional[int] = None,
    position_id: Optional[int] = None,
    schedule_id: Optional[int] = None,
) -> bytes:
    """Genera un reporte PDF simple de formato horizontal (landscape) para todos los registros de asistencia."""
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

def _generate_individual_pdf(summaries: list, granularity: str, columns: Optional[list] = None) -> bytes:
    """Genera un reporte PDF con diseño ejecutivo vertical para un empleado individual."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        topMargin=0.8*cm, bottomMargin=1.6*cm, leftMargin=0.8*cm, rightMargin=0.8*cm
    )
    
    # Precargar caches de empleado para consulta individual
    schedules_map = {}
    photos_map = {}
    daily_schedules_by_employee = defaultdict(dict)
    
    if summaries:
        first_record = summaries[0]
        emp_id = first_record.get("employee_id")
        if emp_id:
            from backend.database import SessionLocal
            db = SessionLocal()
            try:
                emp = db.query(Employee).options(joinedload(Employee.schedule)).filter(Employee.id == emp_id).first()
                if emp:
                    if emp.schedule and emp.schedule.work_days:
                        schedules_map[emp.id] = [int(x) for x in emp.schedule.work_days.split(",")]
                    photos_map[emp.id] = emp.photo_path
                
                # Fetch daily schedules
                dates = []
                for s in summaries:
                    try:
                        dates.append(datetime.strptime(s["date"], "%Y-%m-%d").date())
                    except:
                        pass
                if dates:
                    min_date = min(dates)
                    max_date = max(dates)
                    dailies = db.query(EmployeeDailySchedule).filter(
                        EmployeeDailySchedule.employee_id == emp_id,
                        EmployeeDailySchedule.date >= min_date,
                        EmployeeDailySchedule.date <= max_date
                    ).all()
                    for d in dailies:
                        daily_schedules_by_employee[emp_id][d.date] = d
            except Exception as e:
                logger.error(f"Error loading cache for individual PDF: {e}")
            finally:
                db.close()
                
    elements = _get_employee_flowables(
        summaries, granularity, 
        schedules_map=schedules_map, 
        photos_map=photos_map, 
        daily_schedules_by_employee=daily_schedules_by_employee, 
        columns=columns
    )
    doc.build(elements, canvasmaker=NumberedCanvas)
    return doc.filename if hasattr(doc, 'filename') else buf.getvalue()

def _generate_grouped_pdf(summaries: list, granularity: str, progress_callback = None, columns: Optional[list] = None) -> bytes:
    """Genera un reporte PDF unificado de alta calidad, agrupado por persona, resolviendo la consulta N+1."""
    if not summaries:
        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf, pagesize=A4,
            topMargin=2*cm, bottomMargin=2*cm, leftMargin=2*cm, rightMargin=2*cm
        )
        styles = getSampleStyleSheet()
        elements = [
            Paragraph("Reporte de Asistencia Vacío", ParagraphStyle("TitleEmpty", parent=styles["Title"], textColor=colors.HexColor("#1e3a5f"))),
            Spacer(1, 1*cm),
            Paragraph("No se encontraron registros de asistencia para los filtros y fechas seleccionadas.", ParagraphStyle("BodyEmpty", parent=styles["Normal"], textColor=colors.HexColor("#64748b")))
        ]
        doc.build(elements)
        if progress_callback:
            try:
                progress_callback(100)
            except:
                pass
        return buf.getvalue()

    # Precargar horarios, fotos y horarios diarios de empleados en una sola consulta batch para evitar N+1 queries
    schedules_map = {}
    photos_map = {}
    daily_schedules_by_employee = defaultdict(dict)
    
    from backend.database import SessionLocal
    db = SessionLocal()
    try:
        employees = db.query(Employee).options(joinedload(Employee.schedule)).all()
        for emp in employees:
            if emp.schedule and emp.schedule.work_days:
                schedules_map[emp.id] = [int(x) for x in emp.schedule.work_days.split(",")]
            photos_map[emp.id] = emp.photo_path
            
        # Determinar rango de fechas de análisis
        dates = []
        for s in summaries:
            if "date" in s:
                try:
                    dates.append(datetime.strptime(s["date"], "%Y-%m-%d").date())
                except:
                    pass
        if dates:
            min_date = min(dates)
            max_date = max(dates)
            dailies = db.query(EmployeeDailySchedule).filter(
                EmployeeDailySchedule.date >= min_date,
                EmployeeDailySchedule.date <= max_date
            ).all()
            for d in dailies:
                daily_schedules_by_employee[d.employee_id][d.date] = d
    except Exception as e:
        logger.error(f"Error preloading database records for PDF generation: {e}")
    finally:
        db.close()

    # Agrupar resúmenes por ID de empleado
    grouped = defaultdict(list)
    for s in summaries:
        emp_id = s.get("employee_id")
        if emp_id is not None:
            grouped[emp_id].append(s)

    # Ordenar empleados por nombre
    sorted_emp_ids = sorted(
        grouped.keys(),
        key=lambda eid: grouped[eid][0].get("employee_name", "").lower()
    )

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        topMargin=0.8*cm, bottomMargin=1.6*cm, leftMargin=0.8*cm, rightMargin=0.8*cm
    )
    
    elements = []
    total_emps = len(sorted_emp_ids)
    for idx, emp_id in enumerate(sorted_emp_ids):
        emp_summaries = grouped[emp_id]
        emp_summaries = sorted(emp_summaries, key=lambda x: x.get("date", ""))
        
        emp_flowables = _get_employee_flowables(
            emp_summaries, granularity, 
            schedules_map=schedules_map, 
            photos_map=photos_map,
            daily_schedules_by_employee=daily_schedules_by_employee,
            columns=columns
        )
        elements.extend(emp_flowables)
        
        if idx < total_emps - 1:
            elements.append(PageBreak())
            
        if progress_callback:
            try:
                progress_callback(int((idx + 1) / total_emps * 100))
            except Exception as pe:
                logger.error(f"Error en callback de progreso PDF: {pe}")
            
    doc.build(elements, canvasmaker=NumberedCanvas)
    return buf.getvalue()

def generate_attendance_pdf(summaries: list, granularity: str, progress_callback = None, columns: Optional[list] = None) -> bytes:
    """Genera un reporte de asistencia unificado en PDF (agrupado por persona si hay varios)."""
    return _generate_grouped_pdf(summaries, granularity, progress_callback=progress_callback, columns=columns)

def generate_absences_pdf(absences: list, date_str: str) -> bytes:
    """Genera un reporte PDF vertical (A4) con las ausencias del día."""
    cfg = _get_system_config()
    primary_color_hex = cfg.get("primary_color") or "#1e3a5f"
    primary_color = colors.HexColor(primary_color_hex)
    
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        topMargin=1.5*cm, bottomMargin=1.5*cm, leftMargin=1.5*cm, rightMargin=1.5*cm
    )
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "AbsenceTitle", parent=styles["Title"],
        fontSize=18, leading=22, textColor=primary_color, alignment=0, fontName="Helvetica-Bold"
    )
    sub_style = ParagraphStyle(
        "AbsenceSub", parent=styles["Normal"],
        fontSize=10, leading=14, textColor=colors.HexColor("#64748b")
    )
    cell_style = ParagraphStyle(
        "AbsenceCell", parent=styles["Normal"],
        fontSize=9, leading=11, textColor=colors.HexColor("#1e293b")
    )
    cell_bold = ParagraphStyle(
        "AbsenceCellBold", parent=cell_style, fontName="Helvetica-Bold"
    )
    header_style = ParagraphStyle(
        "AbsenceHeader", parent=cell_bold, textColor=colors.white
    )
    
    elements = [
        Paragraph("REPORTE DIARIO DE AUSENCIAS DETECTADAS", title_style),
        Paragraph(f"Fecha de reporte: <b>{date_str}</b> — Total ausencias: <b>{len(absences)}</b>", sub_style),
        Spacer(1, 0.2*cm),
        Paragraph(f"Sistema: {cfg.get('system_name')} | Empresa: {cfg.get('company_name')}", sub_style),
        Spacer(1, 0.8*cm),
    ]
    
    # Tabla de Ausentes
    data = [[
        Paragraph("Código", header_style),
        Paragraph("Empleado", header_style),
        Paragraph("Departamento", header_style),
        Paragraph("Detalles", header_style)
    ]]
    
    for a in absences:
        data.append([
            Paragraph(a.get("employee_code", "-"), cell_style),
            Paragraph(a.get("employee_name", "Desconocido"), cell_bold),
            Paragraph(a.get("department", "-"), cell_style),
            Paragraph(a.get("details", "-"), cell_style)
        ])
        
    table = Table(data, colWidths=[3.0*cm, 5.0*cm, 4.0*cm, 6.0*cm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), primary_color),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(table)
    
    doc.build(elements)
    return buf.getvalue()
