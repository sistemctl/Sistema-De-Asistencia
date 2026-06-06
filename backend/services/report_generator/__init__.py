"""
Servicio unificado de generación de reportes (Excel & PDF).
"""

from .excel_generator import (
    generate_excel_report,
    generate_consolidated_excel,
    generate_attendance_excel,
)
from .pdf_generator import (
    generate_pdf_report,
    generate_attendance_pdf,
)
