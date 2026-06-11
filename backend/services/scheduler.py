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
from backend.services.hikvision import HikvisionClient
from backend.services.email import notify_attendance_alert, notify_employee_lateness, notify_daily_report
from backend.services.attendance_processor import process_daily_attendance_bulk
from backend.config import SYNC_MAX_EVENTS, TIMEZONE
from backend.utils import get_local_now, to_local_datetime

logger = logging.getLogger(__name__)

_scheduler = BackgroundScheduler(timezone=TIMEZONE)
import threading
_sync_lock = threading.Lock()


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
    
    # Obtener horarios dinámicos de la base de datos
    db = SessionLocal()
    from backend.models import SystemConfig
    sys_cfg = db.query(SystemConfig).first()
    
    absences_hour, absences_minute = 11, 0
    report_hour, report_minute = 19, 0
    cleanup_hour, cleanup_minute = 2, 0
    
    if sys_cfg:
        if sys_cfg.absences_check_time:
            try:
                absences_hour, absences_minute = map(int, sys_cfg.absences_check_time.split(":"))
            except Exception:
                pass
        if sys_cfg.daily_report_time:
            try:
                report_hour, report_minute = map(int, sys_cfg.daily_report_time.split(":"))
            except Exception:
                pass
        if sys_cfg.cleanup_time:
            try:
                cleanup_hour, cleanup_minute = map(int, sys_cfg.cleanup_time.split(":"))
            except Exception:
                pass
    db.close()
    
    # Agregar tarea diaria para ausencias
    _scheduler.add_job(
        check_daily_absences,
        trigger="cron",
        hour=absences_hour,
        minute=absences_minute,
        id="check_daily_absences",
        replace_existing=True,
    )
    
    # Agregar tarea de reporte diario a administradores
    _scheduler.add_job(
        send_daily_report,
        trigger="cron",
        hour=report_hour,
        minute=report_minute,
        id="send_daily_report",
        replace_existing=True,
    )
    
    # Agregar tarea de mantenimiento (limpieza)
    _scheduler.add_job(
        run_daily_cleanup,
        trigger="cron",
        hour=cleanup_hour,
        minute=cleanup_minute,
        id="run_daily_cleanup",
        replace_existing=True,
    )
    
    # Agregar tarea diaria para sincronizar hora del biométrico a las 03:00 AM
    _scheduler.add_job(
        sync_device_time_job,
        trigger="cron",
        hour=3,
        minute=0,
        id="sync_device_time",
        replace_existing=True,
    )

    # Agregar tarea diaria para backup automático a las 04:00 AM
    _scheduler.add_job(
        auto_backup_job,
        trigger="cron",
        hour=4,
        minute=0,
        id="auto_backup",
        replace_existing=True,
    )
    
    _scheduler.start()
    logger.info(f"✅ Scheduler iniciado — sincronización cada {interval} minutos, ausencias a las {absences_hour:02d}:{absences_minute:02d}, reporte a las {report_hour:02d}:{report_minute:02d}, limpieza a las {cleanup_hour:02d}:{cleanup_minute:02d}")
    
    # Aplicar estado inicial de tareas según la BD
    db = SessionLocal()
    try:
        configure_scheduler_jobs(db)
    finally:
        db.close()


def configure_scheduler_jobs(db: Session):
    """
    Pausa o reanuda tareas en el scheduler según la configuración en la base de datos.
    Llamar al iniciar la app o cuando se actualicen los ajustes generales.
    """
    from backend.models import SystemConfig, DeviceConfig
    
    # 1. Configuración de Limpieza y Alertas por Correo
    sys_cfg = db.query(SystemConfig).first()
    if sys_cfg:
        # Tarea de limpieza diaria
        if sys_cfg.cleanup_enabled:
            try:
                cleanup_time = sys_cfg.cleanup_time or "02:00"
                h, m = map(int, cleanup_time.split(":"))
                _scheduler.reschedule_job("run_daily_cleanup", trigger="cron", hour=h, minute=m)
                _scheduler.resume_job("run_daily_cleanup")
                logger.info(f"🧹 Tarea 'run_daily_cleanup' reanudada (activada) a las {cleanup_time} en el scheduler.")
            except Exception as e:
                logger.debug(f"Error al configurar/reanudar run_daily_cleanup: {e}")
        else:
            try:
                _scheduler.pause_job("run_daily_cleanup")
                logger.info("🧹 Tarea 'run_daily_cleanup' pausada (desactivada) en el scheduler.")
            except Exception as e:
                logger.debug(f"Error al pausar run_daily_cleanup: {e}")

        # Tarea de reporte diario (las 19:00)
        if sys_cfg.email_notifications_enabled and sys_cfg.alert_admin_daily_report:
            try:
                report_time = sys_cfg.daily_report_time or "19:00"
                h, m = map(int, report_time.split(":"))
                _scheduler.reschedule_job("send_daily_report", trigger="cron", hour=h, minute=m)
                _scheduler.resume_job("send_daily_report")
                logger.info(f"📊 Tarea 'send_daily_report' reanudada (activada) a las {report_time} en el scheduler.")
            except Exception as e:
                logger.debug(f"Error al configurar/reanudar send_daily_report: {e}")
        else:
            try:
                _scheduler.pause_job("send_daily_report")
                logger.info("📊 Tarea 'send_daily_report' pausada (desactivada) en el scheduler.")
            except Exception as e:
                logger.debug(f"Error al pausar send_daily_report: {e}")

        # Tarea de ausencias diarias (las 11:00)
        if sys_cfg.email_notifications_enabled and sys_cfg.email_alerts_recipients:
            try:
                absences_time = sys_cfg.absences_check_time or "11:00"
                h, m = map(int, absences_time.split(":"))
                _scheduler.reschedule_job("check_daily_absences", trigger="cron", hour=h, minute=m)
                _scheduler.resume_job("check_daily_absences")
                logger.info(f"🔍 Tarea 'check_daily_absences' reanudada (activada) a las {absences_time} en el scheduler.")
            except Exception as e:
                logger.debug(f"Error al configurar/reanudar check_daily_absences: {e}")
        else:
            try:
                _scheduler.pause_job("check_daily_absences")
                logger.info("🔍 Tarea 'check_daily_absences' pausada (desactivada) en el scheduler.")
            except Exception as e:
                logger.debug(f"Error al pausar check_daily_absences: {e}")

    # 2. Configuración de Sincronización Automática
    dev_cfg = db.query(DeviceConfig).first()
    if dev_cfg:
        if getattr(dev_cfg, "automatic_sync_enabled", True):
            try:
                _scheduler.resume_job("sync_hikvision")
                logger.info("📟 Tarea 'sync_hikvision' (sincronización automática) reanudada en el scheduler.")
            except Exception as e:
                logger.debug(f"Error al reanudar sync_hikvision: {e}")
        else:
            try:
                _scheduler.pause_job("sync_hikvision")
                logger.info("📟 Tarea 'sync_hikvision' (sincronización automática) pausada en el scheduler.")
            except Exception as e:
                logger.debug(f"Error al pausar sync_hikvision: {e}")


def check_daily_absences():
    """Verifica ausencias diarias a las 11 AM y notifica al administrador."""
    logger.info("🔍 Ejecutando revisión diaria de ausencias...")
    db = SessionLocal()
    try:
        today = get_local_now().replace(tzinfo=None).date()
        summaries = process_daily_attendance_bulk(db, target_date=today)
        
        absences = []
        for summary in summaries:
            if not summary.get("is_present") and not summary.get("is_off"):
                # No llegó y no es su día libre ni feriado
                emp_name = summary.get("employee_name", "Desconocido")
                emp_code = summary.get("employee_code", "-")
                dept_name = summary.get("department", "-")
                details = f"El empleado no ha registrado entrada el día de hoy ({today.isoformat()})."
                absences.append({
                    "employee_name": emp_name,
                    "employee_code": emp_code,
                    "department": dept_name,
                    "status": "Ausencia Detectada",
                    "details": details
                })
                
        if absences:
            from backend.services.email import notify_grouped_absences
            notify_grouped_absences(db, absences, str(today))
            logger.info(f"⚠️ Alerta agrupada de ausencias enviada con {len(absences)} empleados.")
    except Exception as e:
        logger.error(f"❌ Error al revisar ausencias diarias: {e}")
    finally:
        db.close()


def send_daily_report():
    """Genera y envía el reporte diario consolidado a administradores a las 19:00."""
    logger.info("📊 Ejecutando generación de reporte diario...")
    db = SessionLocal()
    try:
        today = get_local_now().replace(tzinfo=None).date()
        summaries = process_daily_attendance_bulk(db, target_date=today)
        
        notify_daily_report(db, str(today), summaries)
        logger.info("✅ Reporte diario enviado exitosamente.")
    except Exception as e:
        logger.error(f"❌ Error al generar reporte diario: {e}")
    finally:
        db.close()


def run_daily_cleanup():
    """Ejecuta la limpieza automática de la base de datos de acuerdo al horario configurado."""
    logger.info("🧹 Ejecutando limpieza automática de datos obsoletos...")
    db = SessionLocal()
    try:
        from backend.models import SystemConfig
        config = db.query(SystemConfig).first()
        if not config or not config.cleanup_enabled:
            return
            
        from backend.services.maintenance import cleanup_old_data
        cleanup_old_data(db, config)
        logger.info("🧹 Limpieza automática finalizada con éxito.")
    except Exception as e:
        logger.error(f"❌ Error en tarea de limpieza: {e}")
    finally:
        db.close()


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


def _sync_pending_employees_to_device(db: Session, client: HikvisionClient):
    """Busca empleados creados/actualizados sin sincronización y los sube al biométrico."""
    try:
        pending_emps = db.query(Employee).filter(
            Employee.synced_to_device == False, 
            Employee.is_active == True
        ).all()
        
        if not pending_emps:
            return

        logger.info(f"🔄 Se encontraron {len(pending_emps)} empleados pendientes de sincronización al dispositivo.")
        
        from backend.config import UPLOADS_DIR
        
        for emp in pending_emps:
            try:
                device_uid = emp.employee_code
                # 1. Registrar usuario en el terminal
                client.create_user(device_uid, emp.full_name, emp.card_number)
                emp.device_user_id = device_uid
                emp.synced_to_device = True
                
                # 2. Si tiene foto de perfil cargada, sincronizarla
                if emp.photo_path:
                    photo_file = UPLOADS_DIR.parent / emp.photo_path
                    if photo_file.exists():
                        try:
                            with open(photo_file, "rb") as img:
                                client.upload_face_photo(device_uid, img.read())
                            logger.info(f"📸 Foto de perfil de {emp.employee_code} sincronizada al dispositivo.")
                        except Exception as img_err:
                            logger.error(f"⚠️ Error al subir foto para {emp.employee_code}: {img_err}")
                
                db.commit()
                logger.info(f"✅ Empleado {emp.employee_code} sincronizado con éxito al dispositivo en segundo plano.")
            except Exception as emp_err:
                logger.error(f"❌ Fallo al sincronizar empleado {emp.employee_code}: {emp_err}")
                db.rollback()
    except Exception as e:
        logger.error(f"❌ Error en el proceso de sincronización en segundo plano de empleados: {e}")


def sync_job():
    """Tarea principal de sincronización. Se ejecuta periódicamente."""
    if not _sync_lock.acquire(blocking=False):
        logger.info("Sincronización ya en curso. Omitiendo ejecución periódica.")
        return

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
        was_online_previously = cfg.is_online
        is_online = client.check_online()

        if was_online_previously and not is_online:
            # Transición de online a offline
            notify_attendance_alert(
                db, 
                "SISTEMA", 
                str(get_local_now().replace(tzinfo=None)), 
                "DISPOSITIVO FUERA DE LÍNEA", 
                f"El biométrico en la IP {cfg.ip_address} ha dejado de responder a la sincronización en red local."
            )
            logger.warning("⚠️ El dispositivo pasó a estado OFFLINE. Alerta enviada.")

        # Actualizar estado online en BD
        cfg.is_online = is_online
        cfg.last_check = get_local_now().replace(tzinfo=None)
        db.commit()

        # Determinar desde cuándo traer eventos (Si es la primera vez, trae de hace 90 días)
        since = cfg.last_successful_sync or (get_local_now().replace(tzinfo=None) - timedelta(days=90))
        until = get_local_now().replace(tzinfo=None) + timedelta(hours=1)

        if is_online:
            # Sincronizar empleados pendientes primero
            _sync_pending_employees_to_device(db, client)
            
            raw_events = client.get_events(since, until, SYNC_MAX_EVENTS)
            is_mock = False
            logger.info(f"📡 Dispositivo online — {len(raw_events)} eventos obtenidos")
        else:
            # Modo offline: Ya no generamos eventos simulados
            raw_events = []
            is_mock = False
            logger.info(f"📴 Dispositivo offline — Sincronización omitida (MOCK desactivado)")

        new_count = _process_events(db, raw_events, cfg)

        cfg.last_successful_sync = get_local_now().replace(tzinfo=None)
        cfg.total_events_synced += new_count
        _finish_log(db, log, "success", fetched=len(raw_events), new=new_count, is_mock=is_mock)
        logger.info(f"✅ Sync completado — {new_count} registros nuevos")

        if new_count > 0:
            from backend.routers import ws
            import asyncio
            if ws.main_loop:
                asyncio.run_coroutine_threadsafe(
                    ws.manager.broadcast({"type": "NEW_ATTENDANCE", "count": new_count}), 
                    ws.main_loop
                )

    except Exception as e:
        db.rollback()
        _finish_log(db, log, "error", error=str(e))
        logger.error(f"❌ Error en sync: {e}")
    finally:
        db.close()
        _sync_lock.release()


def sync_historic_job(start_date_str: str = None, end_date_str: str = None):
    """Descarga de forma profunda el historial filtrando por fechas dinámicas."""
    import time
    import requests
    from requests.auth import HTTPDigestAuth
    import uuid
    
    if not _sync_lock.acquire(blocking=False):
        logger.warning("Sincronización ya en curso. Omitiendo ejecución de sync histórico.")
        return

    db = SessionLocal()
    cfg = db.query(DeviceConfig).first()
    if not cfg:
        db.close()
        _sync_lock.release()
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
                        
                if events_page is None:
                    raise Exception("Error de comunicación con el biométrico después de 3 intentos.")
                if not events_page:
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
            except Exception:
                current_start += timedelta(days=1)
                
        cfg.total_events_synced += total_inserted
        _finish_log(db, log, "success", fetched=total_downloaded, new=total_inserted, is_mock=False)
        logger.info(f"✅ Sync Histórico completado — {total_inserted} registros insertados")

        if total_inserted > 0:
            from backend.routers import ws
            import asyncio
            if ws.main_loop:
                asyncio.run_coroutine_threadsafe(
                    ws.manager.broadcast({"type": "NEW_ATTENDANCE", "count": total_inserted}), 
                    ws.main_loop
                )

    except Exception as e:
        db.rollback()
        _finish_log(db, log, "error", error=str(e))
        logger.error(f"❌ Error en sync histórico: {e}")
    finally:
        db.close()
        _sync_lock.release()


def _process_events(db: Session, raw_events: list[dict], cfg) -> int:
    """Procesa la lista de eventos y los inserta en BD. Retorna cantidad de nuevos."""
    from sqlalchemy.orm import joinedload
    
    # 1. Pre-filter raw_events and get event_ids & device_uids
    event_ids = []
    device_uids = set()
    valid_events = []
    
    for event in raw_events:
        event_id = event.get("eventId") or event.get("serialNo") or None
        if not event_id:
            continue
        event_ids.append(str(event_id))
        
        device_uid = event.get("employeeNoString") or event.get("employeeNo")
        if device_uid:
            device_uids.add(str(device_uid))
        valid_events.append((event_id, device_uid, event))

    if not valid_events:
        return 0

    # 2. Batch check existing events in database
    existing_ids = set()
    if event_ids:
        for i in range(0, len(event_ids), 500):
            chunk = event_ids[i:i+500]
            rows = db.query(AttendanceRecord.device_event_id).filter(
                AttendanceRecord.device_event_id.in_(chunk)
            ).all()
            for r in rows:
                existing_ids.add(r[0])

    # 3. Batch query employees to match device_uids
    # 3. Batch query employees to match device_uids
    employee_map = {}
    if device_uids:
        uids_list = list(device_uids)
        for i in range(0, len(uids_list), 500):
            chunk = uids_list[i:i+500]
            emps = db.query(Employee).options(
                joinedload(Employee.schedule),
                joinedload(Employee.department)
            ).filter(
                Employee.device_user_id.in_(chunk)
            ).all()
            for emp in emps:
                employee_map[emp.device_user_id] = emp

    new_count = 0
    new_records_data = []
    
    for event_id, device_uid, event in valid_events:
        if str(event_id) in existing_ids:
            continue

        employee = employee_map.get(str(device_uid))
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
        try:
            from backend.models import SystemConfig
            sys_config = db.query(SystemConfig).first()
            tolerance_enable = sys_config.tolerance_enable if (sys_config and hasattr(sys_config, 'tolerance_enable')) else True
            flexible_shift_enable = sys_config.flexible_shift_enable if (sys_config and hasattr(sys_config, 'flexible_shift_enable')) else True
            flexible_shift_start_str = sys_config.flexible_shift_start if (sys_config and hasattr(sys_config, 'flexible_shift_start')) else "09:00:00"
            flexible_shift_end_str = sys_config.flexible_shift_end if (sys_config and hasattr(sys_config, 'flexible_shift_end')) else "18:00:00"

            entry_tolerance = sys_config.entry_tolerance_minutes if (sys_config and tolerance_enable) else 0
            exit_tolerance = sys_config.exit_tolerance_minutes if (sys_config and tolerance_enable) else 0

            # 1. Definir los checkpoints (horas objetivo y su tipo 'entry' o 'exit')
            checkpoints = []
            is_flexible_sched = False
            
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
                    if flexible_shift_enable:
                        sched_name = (sched.name or "").lower()
                        if "flexible" in sched_name or "flex" in sched_name:
                            is_flexible_sched = True
            else:
                # Horario personalizado (2 checkpoints)
                checkpoints = [
                    {"time": employee.work_start_time, "type": "entry"},
                    {"time": employee.work_end_time, "type": "exit"}
                ]

            if is_flexible_sched:
                # Flexible schedule evaluation in real-time sync
                # Find work duration
                from backend.services.attendance_processor import parse_time
                work_start = parse_time(employee.schedule.work_start_time)
                work_end = parse_time(employee.schedule.work_end_time)
                if work_start and work_end:
                    if work_start > work_end:
                        duration_secs = (datetime.combine(event_time.date() + timedelta(days=1), work_end) - datetime.combine(event_time.date(), work_start)).total_seconds()
                    else:
                        duration_secs = (datetime.combine(event_time.date(), work_end) - datetime.combine(event_time.date(), work_start)).total_seconds()
                else:
                    duration_secs = 8 * 3600

                flex_start = parse_time(flexible_shift_start_str) or parse_time("09:00")
                flex_end = parse_time(flexible_shift_end_str) or parse_time("18:00")
                
                target_flex_start = datetime.combine(event_time.date(), flex_start)
                target_flex_end = datetime.combine(event_time.date(), flex_end)
                mid_point = target_flex_start + timedelta(hours=6)

                event_type = "entry" if event_time <= mid_point else "exit"

                if event_type == "entry":
                    # Check late relative to target_flex_end
                    diff_minutes = (event_time - target_flex_end).total_seconds() / 60.0
                    is_late = diff_minutes > entry_tolerance
                else:
                    # Check early checkout relative to actual entry punch on that day (if any exists in DB)
                    entry_rec = db.query(AttendanceRecord).filter(
                        AttendanceRecord.employee_id == employee.id,
                        AttendanceRecord.event_time >= datetime.combine(event_time.date(), datetime.min.time()),
                        AttendanceRecord.event_time <= event_time,
                        AttendanceRecord.event_type == "entry"
                    ).order_by(AttendanceRecord.event_time.asc()).first()

                    if entry_rec:
                        expected_exit = entry_rec.event_time + timedelta(seconds=duration_secs)
                        diff_minutes = (expected_exit - event_time).total_seconds() / 60.0
                        is_late = diff_minutes > exit_tolerance
                    else:
                        # Fallback if no entry was recorded, check against the schedule's end time
                        if work_end:
                            target_end = datetime.combine(event_time.date(), work_end)
                            diff_minutes = (target_end - event_time).total_seconds() / 60.0
                            is_late = diff_minutes > exit_tolerance
            else:
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
                        is_late = min_diff_mins > entry_tolerance
                    else:
                        # Salida temprana (negativo significa que salió antes de la hora)
                        is_late = min_diff_mins < -exit_tolerance
                else:
                    # Fallback si no hay checkpoints
                    hour = event_time.hour
                    event_type = "entry" if 5 <= hour < 13 else "exit"
        except Exception:
            # Fallback general
            hour = event_time.hour
            event_type = "entry" if 5 <= hour < 13 else "exit"

        record = AttendanceRecord(
            employee_id=employee.id,
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
        
        # Guardar para broadcast de websocket
        new_records_data.append({
            "type": "NEW_ATTENDANCE_RECORD",
            "employee_code": employee.employee_code,
            "full_name": employee.full_name,
            "photo_path": employee.photo_path,
            "timestamp": event_time.strftime('%H:%M:%S'),
            "event_type": event_type,
            "is_late": is_late,
            "department": employee.department.name if employee.department else "N/A"
        })
        
        # Disparar alerta si es tardanza del día actual
        today_date = get_local_now().replace(tzinfo=None).date()
        if is_late and event_type == "entry" and event_time.date() == today_date:
            if 'min_diff_mins' in locals() and min_diff_mins != float('inf'):
                diff_formatted = round(min_diff_mins, 1)
            else:
                diff_formatted = 0
            
            # Enviar recomendación al correo del empleado (si lo tiene registrado)
            notify_employee_lateness(db, employee.full_name, employee.email, str(event_time.strftime('%H:%M:%S')), float(diff_formatted))

    db.commit()
    
    # Broadcast de websocket
    if new_count > 0:
        from backend.routers import ws
        import asyncio
        if ws.main_loop:
            for rec in new_records_data:
                asyncio.run_coroutine_threadsafe(
                    ws.manager.broadcast(rec),
                    ws.main_loop
                )
                
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

def sync_device_time_job():
    """Sincroniza la hora del biométrico con la hora local del servidor para evitar desfases."""
    logger.info("📟 Ejecutando sincronización de hora del biométrico...")
    db = SessionLocal()
    try:
        cfg = db.query(DeviceConfig).first()
        if not cfg:
            logger.warning("No hay configuración de dispositivo para sincronizar hora.")
            return
            
        client = HikvisionClient(cfg.ip_address, cfg.port, cfg.username, cfg.password)
        if client.check_online():
            res = client.sync_time()
            logger.info(f"✅ Sincronización de hora exitosa: {res}")
        else:
            logger.warning("⚠️ Dispositivo fuera de línea. Omitiendo sincronización horaria.")
    except Exception as e:
        logger.error(f"❌ Error al sincronizar hora del biométrico: {e}")
    finally:
        db.close()

def auto_backup_job():
    """Ejecuta la copia de seguridad automática y limpia respaldos obsoletos."""
    logger.info("💾 Iniciando copia de seguridad automática de base de datos e imágenes...")
    from backend.config import BACKUP_DIR, BACKUP_RETENTION_DAYS
    from backend.services.backup_service import create_backup_zip, cleanup_old_backups
    from backend.database import SessionLocal
    from backend.models import SystemConfig
    
    db = SessionLocal()
    backup_dir = BACKUP_DIR
    retention_days = BACKUP_RETENTION_DAYS
    
    try:
        config = db.query(SystemConfig).first()
        if config:
            if config.backup_dir:
                backup_dir = config.backup_dir
            if config.backup_retention_days is not None:
                retention_days = config.backup_retention_days
    except Exception as db_err:
        logger.error(f"⚠️ Error al obtener configuración de backups de la BD: {db_err}")
    finally:
        db.close()
        
    try:
        # Generar el respaldo
        backup_zip_path = create_backup_zip(backup_dir)
        logger.info(f"✅ Copia de seguridad automática creada: {backup_zip_path}")
        
        # Realizar limpieza rodante
        cleanup_old_backups(backup_dir, retention_days)
    except Exception as e:
        logger.error(f"❌ Error en la tarea de respaldo automático: {e}")

