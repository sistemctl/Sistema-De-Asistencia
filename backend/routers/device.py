"""Router del dispositivo: estado, config, sync manual, logs."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.auth import get_current_user, require_admin
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
def get_config(db: Session = Depends(get_db), _=Depends(require_admin)):
    cfg = db.query(DeviceConfig).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="No hay configuración")
    return cfg


@router.put("/config", response_model=DeviceConfigOut)
def update_config(data: DeviceConfigUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
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
def manual_sync(_=Depends(require_admin)):
    """Dispara una sincronización manual inmediata."""
    import threading
    t = threading.Thread(target=sched.sync_job, daemon=True)
    t.start()
    return {"ok": True, "message": "Sincronización iniciada en segundo plano"}


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
    from datetime import datetime
    cfg.last_check = datetime.utcnow()
    db.commit()

    return {"is_online": online, "ip_address": cfg.ip_address}


@router.get("/logs", response_model=list[SyncLogOut])
def get_sync_logs(limit: int = 20, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(SyncLog).order_by(SyncLog.started_at.desc()).limit(limit).all()
