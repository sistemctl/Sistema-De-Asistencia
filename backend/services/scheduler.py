"""
Scheduler de sincronización automática con el dispositivo Hikvision.
Usa APScheduler para ejecutar la sincronización cada N minutos en segundo plano.
"""
import json
import logging
from datetime import datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from backend.database import SessionLocal
from backend.models import AttendanceRecord, DeviceConfig, Employee, SyncLog
from backend.services.hikvision import HikvisionClient, generate_mock_events
from backend.config import SYNC_MAX_EVENTS

logger = logging.getLogger(__name__)

_scheduler = BackgroundScheduler(timezone="America/Lima")


def start_scheduler():
    """Inicia el scheduler. Llamar una sola vez al arrancar la app."""
    cfg = _get_device_config()
    interval = cfg.sync_interval_minutes if cfg else 5

    _scheduler.add_job(
        sync_job,
        trigger="interval",
        minutes=interval,
        id="sync_hikvision",
        replace_existing=True,
        next_run_time=datetime.now(),  # Ejecutar inmediatamente al iniciar
    )
    _scheduler.start()
    logger.info(f"✅ Scheduler iniciado — sincronización cada {interval} minutos")


def stop_scheduler():
    """Detiene el scheduler al apagar la app."""
    if _scheduler.running:
        _scheduler.shutdown(wait=False)


def update_sync_interval(minutes: int):
    """Actualiza el intervalo sin reiniciar la app."""
    _scheduler.reschedule_job(
        "sync_hikvision",
        trigger="interval",
        minutes=minutes,
    )
    logger.info(f"🔄 Intervalo de sync actualizado a {minutes} minutos")


def sync_job():
    """Tarea principal de sincronización. Se ejecuta periódicamente."""
    db = SessionLocal()
    log = SyncLog(started_at=datetime.utcnow(), status="running")
    db.add(log)
    db.commit()
    db.refresh(log)

    try:
        cfg = db.query(DeviceConfig).first()
        if not cfg:
            _finish_log(db, log, "error", error="No hay configuración de dispositivo")
            return

        client = HikvisionClient(cfg.ip_address, cfg.port, cfg.username, cfg.password)
        is_online = client.check_online()

        # Actualizar estado online en BD
        cfg.is_online = is_online
        cfg.last_check = datetime.utcnow()
        db.commit()

        # Determinar desde cuándo traer eventos
        since = cfg.last_successful_sync or (datetime.utcnow() - timedelta(days=7))

        if is_online:
            raw_events = client.get_events(since, datetime.utcnow(), SYNC_MAX_EVENTS)
            is_mock = False
            logger.info(f"📡 Dispositivo online — {len(raw_events)} eventos obtenidos")
        else:
            # Modo offline: generar eventos simulados
            employee_ids = [e.device_user_id or str(e.id) for e in
                            db.query(Employee).filter(Employee.is_active == True).all()]
            if not employee_ids:
                employee_ids = [str(i) for i in range(1, 6)]
            raw_events = generate_mock_events(since, employee_ids, max_events=30)
            is_mock = True
            logger.info(f"🔵 Dispositivo offline — {len(raw_events)} eventos simulados")

        new_count = _process_events(db, raw_events)

        # Actualizar estadísticas
        cfg.last_successful_sync = datetime.utcnow()
        cfg.total_events_synced += new_count
        _finish_log(db, log, "success", fetched=len(raw_events), new=new_count, is_mock=is_mock)
        logger.info(f"✅ Sync completado — {new_count} registros nuevos")

    except Exception as e:
        db.rollback()
        _finish_log(db, log, "error", error=str(e))
        logger.error(f"❌ Error en sync: {e}")
    finally:
        db.close()


def _process_events(db: Session, raw_events: list[dict]) -> int:
    """Procesa la lista de eventos y los inserta en BD. Retorna cantidad de nuevos."""
    new_count = 0
    for event in raw_events:
        event_id = event.get("eventId") or event.get("serialNo") or None
        if not event_id:
            continue

        # Evitar duplicados
        existing = db.query(AttendanceRecord).filter(
            AttendanceRecord.device_event_id == str(event_id)
        ).first()
        if existing:
            continue

        # Resolver empleado
        device_uid = event.get("employeeNoString") or event.get("employeeNo")
        employee = None
        if device_uid:
            employee = db.query(Employee).filter(
                Employee.device_user_id == str(device_uid)
            ).first()

        # Parsear timestamp
        raw_time = event.get("time", "")
        try:
            event_time = datetime.fromisoformat(raw_time.replace("Z", "+00:00").replace("+00:00", ""))
        except Exception:
            event_time = datetime.utcnow()

        # Determinar tipo de evento (entrada/salida por hora)
        hour = event_time.hour
        event_type = "entry" if 5 <= hour < 13 else "exit"

        # Detectar tardanza
        is_late = False
        if employee and event_type == "entry":
            try:
                h, m = map(int, employee.work_start_time.split(":"))
                is_late = event_time.hour > h or (event_time.hour == h and event_time.minute > m + 10)
            except Exception:
                pass

        record = AttendanceRecord(
            employee_id=employee.id if employee else None,
            device_event_id=str(event_id),
            device_user_id=str(device_uid) if device_uid else None,
            event_time=event_time,
            event_type=event_type,
            auth_method=event.get("currentVerifyMode"),
            is_late=is_late,
            raw_data=json.dumps(event),
        )
        db.add(record)
        new_count += 1

    db.commit()
    return new_count


def _get_device_config():
    db = SessionLocal()
    try:
        return db.query(DeviceConfig).first()
    finally:
        db.close()


def _finish_log(db, log, status, fetched=0, new=0, error=None, is_mock=False):
    log.finished_at = datetime.utcnow()
    log.status = status
    log.events_fetched = fetched
    log.events_new = new
    log.error_message = error
    log.is_mock = is_mock
    db.commit()
