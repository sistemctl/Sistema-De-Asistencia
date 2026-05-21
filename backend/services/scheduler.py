"""
Scheduler de sincronización automática con el dispositivo Hikvision.
Usa APScheduler para ejecutar la sincronización cada N minutos en segundo plano.
"""
import json
import logging
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from backend.database import SessionLocal
from backend.models import AttendanceRecord, DeviceConfig, Employee, SyncLog
from backend.services.hikvision import HikvisionClient, generate_mock_events
from backend.config import SYNC_MAX_EVENTS, TIMEZONE
from backend.utils import get_local_now, to_local_datetime

logger = logging.getLogger(__name__)

_scheduler = BackgroundScheduler(timezone=TIMEZONE)


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
        next_run_time=get_local_now().replace(tzinfo=None),  # Ejecutar inmediatamente al iniciar
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
    log = SyncLog(started_at=get_local_now().replace(tzinfo=None), status="running")
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
        cfg.last_check = get_local_now().replace(tzinfo=None)
        db.commit()

        # Determinar desde cuándo traer eventos (Si es la primera vez, trae de hace 90 días)
        since = cfg.last_successful_sync or (get_local_now().replace(tzinfo=None) - timedelta(days=90))
        until = get_local_now().replace(tzinfo=None) + timedelta(hours=1)

        if is_online:
            raw_events = client.get_events(since, until, SYNC_MAX_EVENTS)
            is_mock = False
            logger.info(f"📡 Dispositivo online — {len(raw_events)} eventos obtenidos")
        else:
            # Modo offline: Ya no generamos eventos simulados
            raw_events = []
            is_mock = False
            logger.info(f"📴 Dispositivo offline — Sincronización omitida (MOCK desactivado)")

        new_count = _process_events(db, raw_events, cfg)

        # Actualizar estadísticas
        cfg.last_successful_sync = get_local_now().replace(tzinfo=None)
        cfg.total_events_synced += new_count
        _finish_log(db, log, "success", fetched=len(raw_events), new=new_count, is_mock=is_mock)
        logger.info(f"✅ Sync completado — {new_count} registros nuevos")

    except Exception as e:
        db.rollback()
        _finish_log(db, log, "error", error=str(e))
        logger.error(f"❌ Error en sync: {e}")
    finally:
        db.close()


def sync_historic_job(start_date_str: str = None, end_date_str: str = None):
    """Descarga de forma profunda el historial filtrando por fechas dinámicas."""
    import time
    import requests
    from requests.auth import HTTPDigestAuth
    import uuid
    
    db = SessionLocal()
    cfg = db.query(DeviceConfig).first()
    if not cfg:
        db.close()
        return

    log = SyncLog(started_at=get_local_now().replace(tzinfo=None), status="running")
    db.add(log)
    db.commit()

    try:
        client = HikvisionClient(cfg.ip_address, cfg.port, cfg.username, cfg.password)
        if not client.check_online():
            raise Exception("Dispositivo fuera de línea")

        if start_date_str:
            current_start = datetime.strptime(start_date_str, "%Y-%m-%d")
        else:
            current_start = datetime(2020, 1, 1, 0, 0, 0)
            
        if end_date_str:
            final_end = datetime.strptime(end_date_str, "%Y-%m-%d") + timedelta(days=1)
        else:
            final_end = get_local_now().replace(tzinfo=None) + timedelta(days=1)
        
        total_downloaded = 0
        total_inserted = 0
        tz = ZoneInfo(TIMEZONE)
        
        while current_start < final_end:
            st_aware = current_start.replace(tzinfo=tz) if not current_start.tzinfo else current_start.astimezone(tz)
            st_aware = st_aware.replace(microsecond=0)
            
            search_id = uuid.uuid4().hex
            position = 0
            limit = 500
            last_event_time_str = None
            
            while True:
                payload = {
                    "AcsEventCond": {
                        "searchID": search_id,
                        "searchResultPosition": position,
                        "maxResults": limit,
                        "major": 5,
                        "minor": 0,
                        "startTime": st_aware.isoformat(),
                        "endTime": final_end.replace(tzinfo=tz).replace(microsecond=0).isoformat(),
                    }
                }
                
                events_page = None
                for attempt in range(3):
                    try:
                        r = requests.post(
                            f"{client.base_url}/AccessControl/AcsEvent?format=json",
                            auth=HTTPDigestAuth(client.username, client.password),
                            json=payload,
                            timeout=30
                        )
                        r.raise_for_status()
                        data = r.json()
                        events_page = data.get("AcsEvent", {}).get("InfoList", [])
                        break
                    except Exception as e:
                        time.sleep(1)
                        
                if events_page is None or not events_page:
                    break
                    
                total_downloaded += len(events_page)
                last_event_time_str = events_page[-1].get("time")
                
                new_count = _process_events(db, events_page, cfg)
                total_inserted += new_count
                db.commit()
                
                status_str = data.get("AcsEvent", {}).get("responseStatusStrg", "")
                if status_str != "MORE":
                    break
                    
                position += len(events_page)
                time.sleep(0.1)
                
            if not last_event_time_str:
                break
                
            try:
                dt = datetime.fromisoformat(last_event_time_str.replace("Z", "+00:00"))
                current_start = dt.replace(tzinfo=None) + timedelta(seconds=1)
            except:
                current_start += timedelta(days=1)
                
        cfg.total_events_synced += total_inserted
        _finish_log(db, log, "success", fetched=total_downloaded, new=total_inserted, is_mock=False)
        logger.info(f"✅ Sync Histórico completado — {total_inserted} registros insertados")

    except Exception as e:
        db.rollback()
        _finish_log(db, log, "error", error=str(e))
        logger.error(f"❌ Error en sync histórico: {e}")
    finally:
        db.close()


def _process_events(db: Session, raw_events: list[dict], cfg) -> int:
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

        # Ignorar evento si la persona no está en la base de datos de empleados
        if not employee:
            continue

        # Parsear timestamp
        raw_time = event.get("time", "")
        try:
            # Reemplazar Z por +00:00 para que fromisoformat lo entienda
            dt = datetime.fromisoformat(raw_time.replace("Z", "+00:00"))
            # Convertir a local y guardar como naive (SQLAlchemy/DB local)
            event_time = to_local_datetime(dt).replace(tzinfo=None)
        except Exception:
            event_time = get_local_now().replace(tzinfo=None)

        # Determinar tipo de evento (entrada/salida) y tardanza según el tipo de jornada
        is_late = False
        event_type = "entry"
        if employee:
            try:
                # 1. Definir los checkpoints (horas objetivo y su tipo 'entry' o 'exit')
                checkpoints = []
                
                if employee.schedule_id and employee.schedule:
                    sched = employee.schedule
                    if sched.shift_type == "split":
                        # Jornada partida (4 checkpoints)
                        checkpoints = [
                            {"time": sched.work_start_time, "type": "entry"},
                            {"time": sched.lunch_start_time, "type": "exit"},
                            {"time": sched.lunch_end_time, "type": "entry"},
                            {"time": sched.work_end_time, "type": "exit"}
                        ]
                    else:
                        # Jornada continua (2 checkpoints)
                        checkpoints = [
                            {"time": sched.work_start_time, "type": "entry"},
                            {"time": sched.work_end_time, "type": "exit"}
                        ]
                else:
                    # Horario personalizado (2 checkpoints)
                    checkpoints = [
                        {"time": employee.work_start_time, "type": "entry"},
                        {"time": employee.work_end_time, "type": "exit"}
                    ]
                
                # 2. Encontrar el checkpoint más cercano al event_time de forma dinámica
                closest_checkpoint = None
                min_diff_mins = float('inf')
                
                for cp in checkpoints:
                    if cp["time"]:
                        h, m = map(int, cp["time"].split(":"))
                        target = event_time.replace(hour=h, minute=m, second=0)
                        diff = (event_time - target).total_seconds() / 60.0
                        if abs(diff) < abs(min_diff_mins):
                            min_diff_mins = diff
                            closest_checkpoint = cp
                
                if closest_checkpoint:
                    event_type = closest_checkpoint["type"]
                    # 3. Calcular si es tardanza o salida temprana
                    if event_type == "entry":
                        is_late = min_diff_mins > cfg.entry_tolerance_minutes
                    else:
                        # Salida temprana (negativo significa que salió antes de la hora)
                        is_late = min_diff_mins < -cfg.exit_tolerance_minutes
                else:
                    # Fallback si no hay checkpoints
                    hour = event_time.hour
                    event_type = "entry" if 5 <= hour < 13 else "exit"
            except Exception:
                # Fallback general
                hour = event_time.hour
                event_type = "entry" if 5 <= hour < 13 else "exit"
        else:
            # Fallback para eventos sin empleado asociado
            hour = event_time.hour
            event_type = "entry" if 5 <= hour < 13 else "exit"

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
    log.finished_at = get_local_now().replace(tzinfo=None)
    log.status = status
    log.events_fetched = fetched
    log.events_new = new
    log.error_message = error
    log.is_mock = is_mock
    db.commit()
