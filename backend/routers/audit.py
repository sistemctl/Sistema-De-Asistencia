from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date

from backend.database import get_db
from backend.models import User, AuditLog
from backend.schemas import AuditLogOut
from backend.routers.auth import get_current_user

router = APIRouter(prefix="/api/audit", tags=["audit"])

@router.get("", response_model=dict)
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    action: Optional[str] = None,
    entity: Optional[str] = None,
    user_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200)
):
    """
    Obtiene el historial de auditoría con soporte de paginación y filtros.
    Solo accesible para Super Administradores.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Privilegios insuficientes.")

    # Usamos joinedload para traer el usuario en la misma consulta y evitar DetachedInstanceError
    query = db.query(AuditLog).options(joinedload(AuditLog.user))

    if action:
        query = query.filter(AuditLog.action == action)
    if entity:
        query = query.filter(AuditLog.entity == entity)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if date_from:
        query = query.filter(AuditLog.created_at >= date_from)
    if date_to:
        query = query.filter(AuditLog.created_at <= date_to)

    total = query.count()
    logs = query.order_by(AuditLog.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    # Validamos y serializamos con Pydantic para formatear y omitir campos sensibles como hashed_password
    items = []
    for log in logs:
        items.append(AuditLogOut.model_validate(log).model_dump())

    return {
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
        "items": items
    }


@router.get("/export")
def export_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    action: Optional[str] = None,
    entity: Optional[str] = None,
    user_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None
):
    """
    Exporta el historial de auditoría filtrado a formato CSV.
    Solo accesible para Super Administradores.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Privilegios insuficientes.")

    query = db.query(AuditLog).options(joinedload(AuditLog.user))

    if action:
        query = query.filter(AuditLog.action == action)
    if entity:
        query = query.filter(AuditLog.entity == entity)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if date_from:
        query = query.filter(AuditLog.created_at >= date_from)
    if date_to:
        query = query.filter(AuditLog.created_at <= date_to)

    logs = query.order_by(AuditLog.created_at.desc()).all()

    # Generate CSV response
    import csv
    import io
    from fastapi.responses import StreamingResponse

    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    
    # Header
    writer.writerow(["Fecha y Hora", "Usuario", "Acción", "Entidad/Módulo", "ID Entidad", "Detalles", "Dirección IP"])
    
    for log in logs:
        user_str = log.user.full_name if log.user else "Sistema"
        time_str = log.created_at.strftime("%Y-%m-%d %H:%M:%S")
        writer.writerow([
            time_str,
            user_str,
            log.action,
            log.entity,
            log.entity_id or "",
            log.details or "",
            log.ip_address or ""
        ])

    output.seek(0)
    
    # We can encode in latin-1 or utf-8-sig to make Excel open it nicely with accents
    response_content = output.getvalue().encode('utf-8-sig')
    
    return StreamingResponse(
        io.BytesIO(response_content),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=log_auditoria.csv"}
    )

