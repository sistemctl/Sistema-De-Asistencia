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
