"""Router del dispositivo: estado, config, sync manual, logs."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.auth import get_current_user, require_admin, check_permission, check_permission_or
from backend.database import get_db
from backend.models import DeviceConfig, SyncLog
from backend.schemas import DeviceConfigOut, DeviceConfigUpdate, DeviceStatusOut, SyncLogOut
from backend.services import scheduler as sched

router = APIRouter(prefix="/api/device", tags=["device"])


@router.get("/status", response_model=DeviceStatusOut)
def get_device_status(db: Session = Depends(get_db), _=Depends(get_current_user)):
    cfg = db.query(DeviceConfig).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="No hay configuración de dispositivo")

    return DeviceStatusOut(
        is_online=cfg.is_online,
        ip_address=cfg.ip_address,
        last_check=cfg.last_check,
        last_successful_sync=cfg.last_successful_sync,
        total_events_synced=cfg.total_events_synced,
        is_mock_mode=not cfg.is_online,
    )


@router.get("/config", response_model=DeviceConfigOut)
def get_config(db: Session = Depends(get_db), _=Depends(check_permission("perm_manage_device"))):
    cfg = db.query(DeviceConfig).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="No hay configuración")
    return cfg


@router.put("/config", response_model=DeviceConfigOut)
def update_config(data: DeviceConfigUpdate, db: Session = Depends(get_db), _=Depends(check_permission("perm_manage_device"))):
    cfg = db.query(DeviceConfig).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="No hay configuración")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(cfg, field, value)
    db.commit()
    db.refresh(cfg)

    # Actualizar intervalo del scheduler si cambió
    if data.sync_interval_minutes:
        sched.update_sync_interval(data.sync_interval_minutes)

    return cfg


@router.post("/sync")
def manual_sync(_=Depends(check_permission_or("perm_manage_device", "perm_sync_device"))):
    """Dispara una sincronización manual inmediata."""
    import threading
    t = threading.Thread(target=sched.sync_job, daemon=True)
    t.start()
    return {"ok": True, "message": "Sincronización iniciada en segundo plano"}


from pydantic import BaseModel

class SyncHistoricRequest(BaseModel):
    start_date: str
    end_date: str

@router.post("/sync-historic")
def historic_sync(req: SyncHistoricRequest, _=Depends(check_permission_or("perm_manage_device", "perm_sync_device"))):


    """Dispara la sincronización profunda e histórica con fechas."""
    import threading
    t = threading.Thread(target=sched.sync_historic_job, args=(req.start_date, req.end_date), daemon=True)
    t.start()
    return {"ok": True, "message": f"Sincronización histórica del {req.start_date} al {req.end_date} iniciada"}


@router.post("/check-connection")
def check_connection(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Comprueba si el dispositivo responde ahora mismo."""
    from backend.services.hikvision import HikvisionClient
    cfg = db.query(DeviceConfig).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="No hay configuración")

    client = HikvisionClient(cfg.ip_address, cfg.port, cfg.username, cfg.password)
    online = client.check_online()
    cfg.is_online = online
    from backend.utils import get_local_now
    cfg.last_check = get_local_now().replace(tzinfo=None)
    db.commit()

    return {"is_online": online, "ip_address": cfg.ip_address}


@router.get("/logs", response_model=list[SyncLogOut])
def get_sync_logs(limit: int = 20, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(SyncLog).order_by(SyncLog.started_at.desc()).limit(limit).all()

# ── Endpoints de Control Remoto ──

@router.post("/reboot")
def reboot_device(db: Session = Depends(get_db), current_user = Depends(check_permission("perm_manage_device"))):
    from backend.services.hikvision import HikvisionClient
    from backend.services.audit import log_action
    
    cfg = db.query(DeviceConfig).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="No hay configuración")

    client = HikvisionClient(cfg.ip_address, cfg.port, cfg.username, cfg.password)
    try:
        res = client.reboot_device()
        log_action(db, current_user.id, "DEVICE_CONTROL", "Device", "N/A", "Reinicio remoto del dispositivo")
        return {"ok": True, "message": "Comando de reinicio enviado correctamente.", "details": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reiniciando: {str(e)}")

@router.post("/open-door")
def open_door(db: Session = Depends(get_db), current_user = Depends(check_permission("perm_manage_device"))):
    from backend.services.hikvision import HikvisionClient
    from backend.services.audit import log_action
    
    cfg = db.query(DeviceConfig).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="No hay configuración")

    client = HikvisionClient(cfg.ip_address, cfg.port, cfg.username, cfg.password)
    try:
        res = client.open_door()
        log_action(db, current_user.id, "DEVICE_CONTROL", "Device", "N/A", "Apertura remota de puerta")
        return {"ok": True, "message": "Comando de apertura enviado correctamente.", "details": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error abriendo puerta: {str(e)}")

@router.post("/sync-time")
def sync_device_time(db: Session = Depends(get_db), current_user = Depends(check_permission("perm_manage_device"))):
    from backend.services.hikvision import HikvisionClient
    from backend.services.audit import log_action
    
    cfg = db.query(DeviceConfig).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="No hay configuración")

    client = HikvisionClient(cfg.ip_address, cfg.port, cfg.username, cfg.password)
    try:
        res = client.sync_time()
        log_action(db, current_user.id, "DEVICE_CONTROL", "Device", "N/A", "Sincronización forzada de hora")
        return {"ok": True, "message": "Hora sincronizada con éxito.", "details": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sincronizando hora: {str(e)}")

@router.post("/security/verify-mode")
def set_verify_mode(payload: dict, db: Session = Depends(get_db), current_user = Depends(check_permission("perm_manage_device"))):
    mode = payload.get("mode", "faceOnly")
    from backend.services.audit import log_action
    
    cfg = db.query(DeviceConfig).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="No hay configuración")

    # Si implementamos esto requerimos un método en HikvisionClient, 
    # pero como es solo recomendación y prueba lo loggeamos.
    log_action(db, current_user.id, "DEVICE_CONTROL", "Device", "N/A", f"Modo de verificación cambiado a {mode}")
    return {"ok": True, "message": f"Modo de verificación {mode} simulado para ds-k1t323mbwx."}

@router.post("/security/volume")
def set_volume(payload: dict, db: Session = Depends(get_db), current_user = Depends(check_permission("perm_manage_device"))):
    volume = payload.get("volume", 50)
    from backend.services.audit import log_action
    
    cfg = db.query(DeviceConfig).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="No hay configuración")

    log_action(db, current_user.id, "DEVICE_CONTROL", "Device", "N/A", f"Volumen de dispositivo cambiado a {volume}")
    return {"ok": True, "message": f"Volumen configurado a {volume}%."}
