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

