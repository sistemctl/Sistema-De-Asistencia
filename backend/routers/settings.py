import os
import shutil
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.database import get_db
from backend.auth import get_current_user, check_permission
from backend.models import SystemConfig, User

router = APIRouter(prefix="/api/settings", tags=["settings"])


class SettingsUpdateSchema(BaseModel):
    system_name: str
    company_name: str
    primary_color: str
    accent_color: str
    bg_base_color: Optional[str] = None
    bg_surface_color: Optional[str] = None
    work_days: str
    time_format: str
    entry_tolerance_minutes: int
    exit_tolerance_minutes: int
    require_checkin: bool
    require_checkout: bool
    mark_late_enable: bool
    mark_late_limit_minutes: int
    mark_absent_if_late_enable: bool
    mark_absent_if_late_limit_minutes: int
    mark_early_departure_enable: bool
    mark_early_departure_limit_minutes: int
    mark_absent_if_early_checkout_enable: bool
    mark_absent_if_early_checkout_limit_minutes: int
    no_checkin_enable: bool
    no_checkin_status: str
    no_checkout_enable: bool
    no_checkout_status: str
    flexible_shift_start: str
    flexible_shift_end: str

@router.get("")
def get_settings(db: Session = Depends(get_db)):
    config = db.query(SystemConfig).first()
    if not config:
        return {
            "system_name": "Control de Asistencia",
            "company_name": "Hikvision DS-K1T323MBWX",
            "logo_path": None,
            "primary_color": "#1e3a5f",
            "accent_color": "#00e676",
            "bg_base_color": "#f8fafc",
            "bg_surface_color": "#ffffff",
            "work_days": "1,2,3,4,5",
            "time_format": "24h",
            "entry_tolerance_minutes": 10,
            "exit_tolerance_minutes": 10,
            "require_checkin": True,
            "require_checkout": True,
            "mark_late_enable": True,
            "mark_late_limit_minutes": 0,
            "mark_absent_if_late_enable": False,
            "mark_absent_if_late_limit_minutes": 60,
            "mark_early_departure_enable": True,
            "mark_early_departure_limit_minutes": 0,
            "mark_absent_if_early_checkout_enable": False,
            "mark_absent_if_early_checkout_limit_minutes": 60,
            "no_checkin_enable": True,
            "no_checkin_status": "Absent",
            "no_checkout_enable": True,
            "no_checkout_status": "Absent",
            "flexible_shift_start": "09:00:00",
            "flexible_shift_end": "18:00:00"
        }
    return {
        "system_name": config.system_name,
        "company_name": config.company_name,
        "logo_path": config.logo_path,
        "primary_color": config.primary_color,
        "accent_color": config.accent_color,
        "bg_base_color": config.bg_base_color or "#f8fafc",
        "bg_surface_color": config.bg_surface_color or "#ffffff",
        "work_days": config.work_days,
        "time_format": config.time_format,
        "entry_tolerance_minutes": config.entry_tolerance_minutes,
        "exit_tolerance_minutes": config.exit_tolerance_minutes,
        "require_checkin": config.require_checkin,
        "require_checkout": config.require_checkout,
        "mark_late_enable": config.mark_late_enable,
        "mark_late_limit_minutes": config.mark_late_limit_minutes,
        "mark_absent_if_late_enable": config.mark_absent_if_late_enable,
        "mark_absent_if_late_limit_minutes": config.mark_absent_if_late_limit_minutes,
        "mark_early_departure_enable": config.mark_early_departure_enable,
        "mark_early_departure_limit_minutes": config.mark_early_departure_limit_minutes,
        "mark_absent_if_early_checkout_enable": config.mark_absent_if_early_checkout_enable,
        "mark_absent_if_early_checkout_limit_minutes": config.mark_absent_if_early_checkout_limit_minutes,
        "no_checkin_enable": config.no_checkin_enable,
        "no_checkin_status": config.no_checkin_status,
        "no_checkout_enable": config.no_checkout_enable,
        "no_checkout_status": config.no_checkout_status,
        "flexible_shift_start": config.flexible_shift_start,
        "flexible_shift_end": config.flexible_shift_end
    }

@router.put("")
def update_settings(
    data: SettingsUpdateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("perm_manage_settings"))
):
    config = db.query(SystemConfig).first()
    if not config:
        config = SystemConfig()
        db.add(config)
        
    config.system_name = data.system_name
    config.company_name = data.company_name
    config.primary_color = data.primary_color
    config.accent_color = data.accent_color
    config.bg_base_color = data.bg_base_color
    config.bg_surface_color = data.bg_surface_color
    config.work_days = data.work_days
    config.time_format = data.time_format
    config.entry_tolerance_minutes = data.entry_tolerance_minutes
    config.exit_tolerance_minutes = data.exit_tolerance_minutes
    config.require_checkin = data.require_checkin
    config.require_checkout = data.require_checkout
    config.mark_late_enable = data.mark_late_enable
    config.mark_late_limit_minutes = data.mark_late_limit_minutes
    config.mark_absent_if_late_enable = data.mark_absent_if_late_enable
    config.mark_absent_if_late_limit_minutes = data.mark_absent_if_late_limit_minutes
    config.mark_early_departure_enable = data.mark_early_departure_enable
    config.mark_early_departure_limit_minutes = data.mark_early_departure_limit_minutes
    config.mark_absent_if_early_checkout_enable = data.mark_absent_if_early_checkout_enable
    config.mark_absent_if_early_checkout_limit_minutes = data.mark_absent_if_early_checkout_limit_minutes
    config.no_checkin_enable = data.no_checkin_enable
    config.no_checkin_status = data.no_checkin_status
    config.no_checkout_enable = data.no_checkout_enable
    config.no_checkout_status = data.no_checkout_status
    config.flexible_shift_start = data.flexible_shift_start
    config.flexible_shift_end = data.flexible_shift_end
    
    db.commit()
    db.refresh(config)
    return {"status": "success", "message": "Configuración actualizada correctamente."}

@router.post("/logo")
def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("perm_manage_settings"))
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".png", ".jpg", ".jpeg", ".svg"]:
        raise HTTPException(status_code=400, detail="Formato de archivo no válido. Solo se admiten PNG, JPG, JPEG y SVG.")
        
    logo_dir = os.path.abspath("uploads/logo")
    os.makedirs(logo_dir, exist_ok=True)

    
    filename = f"logo{ext}"
    dest_path = os.path.join(logo_dir, filename)
    
    try:
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"No se pudo guardar el archivo: {str(e)}")
        
    config = db.query(SystemConfig).first()
    if not config:
        config = SystemConfig()
        db.add(config)
        
    config.logo_path = f"/uploads/logo/{filename}?v={int(os.path.getmtime(dest_path))}"
    db.commit()
    
    return {"status": "success", "logo_path": config.logo_path}
