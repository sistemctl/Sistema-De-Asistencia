import logging
from datetime import timedelta
from sqlalchemy.orm import Session
from backend.models import SystemConfig, AttendanceRecord, SyncLog, AuditLog
from backend.utils import get_local_now

logger = logging.getLogger(__name__)

def cleanup_old_data(db: Session, config: SystemConfig):
    """
    Elimina registros antiguos según las políticas de retención de datos.
    """
    stats = {
        "attendance": 0,
        "sync_logs": 0,
        "audit_logs": 0
    }
    
    now = get_local_now().replace(tzinfo=None)
    
    try:
        # 1. Asistencias
        if config.cleanup_attendance_enabled and config.retention_attendance_days > 0:
            cutoff_date = (now - timedelta(days=config.retention_attendance_days)).date()
            # Asumiendo que attendance_records usa `event_time` como fecha
            deleted = db.query(AttendanceRecord).filter(
                AttendanceRecord.event_time < cutoff_date
            ).delete(synchronize_session=False)
            stats["attendance"] = deleted
            
        # 2. Logs de Sincronización
        if config.cleanup_sync_enabled and config.retention_sync_logs_days > 0:
            cutoff_date = now - timedelta(days=config.retention_sync_logs_days)
            deleted = db.query(SyncLog).filter(
                SyncLog.started_at < cutoff_date
            ).delete(synchronize_session=False)
            stats["sync_logs"] = deleted
            
        # 3. Logs de Auditoría
        if config.cleanup_audit_enabled and config.retention_audit_logs_days > 0:
            cutoff_date = now - timedelta(days=config.retention_audit_logs_days)
            deleted = db.query(AuditLog).filter(
                AuditLog.created_at < cutoff_date
            ).delete(synchronize_session=False)
            stats["audit_logs"] = deleted

        db.commit()
        logger.info(f"Limpieza de datos ejecutada. Estadísticas: {stats}")
        return stats

    except Exception as e:
        db.rollback()
        logger.error(f"Error durante limpieza de datos: {e}")
        raise e
