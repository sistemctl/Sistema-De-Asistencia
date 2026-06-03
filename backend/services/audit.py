from sqlalchemy.orm import Session
from backend.models import AuditLog
from backend.schemas import AuditLogCreate
import json

def log_action(db: Session, user_id: int, action: str, entity: str, entity_id: str = None, details: str = None, ip_address: str = None):
    """
    Registra una acción en la tabla de auditoría.
    
    :param db: Sesión de la base de datos
    :param user_id: ID del usuario que realiza la acción
    :param action: Acción realizada (ej. 'CREATE', 'UPDATE', 'DELETE')
    :param entity: Entidad afectada (ej. 'Employee', 'SystemConfig')
    :param entity_id: ID del registro afectado (opcional)
    :param details: Detalles adicionales (diccionario que se guardará como JSON string, opcional)
    :param ip_address: IP de la solicitud (opcional)
    """
    if isinstance(details, dict) or isinstance(details, list):
        details_str = json.dumps(details, ensure_ascii=False)
    else:
        details_str = details

    audit_log = AuditLog(
        user_id=user_id,
        action=action,
        entity=entity,
        entity_id=str(entity_id) if entity_id else None,
        details=details_str,
        ip_address=ip_address
    )
    db.add(audit_log)
    db.commit()
    db.refresh(audit_log)
    return audit_log
