import os
import shutil
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.database import get_db
from backend.auth import get_current_user
from backend.models import SystemConfig, User

router = APIRouter(prefix="/api/settings", tags=["settings"])

class SettingsUpdateSchema(BaseModel):
    system_name: str
    company_name: str
    primary_color: str
    accent_color: str
    work_days: str
    time_format: str
    entry_tolerance_minutes: int

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
            "work_days": "1,2,3,4,5",
            "time_format": "24h",
            "entry_tolerance_minutes": 10
        }
    return {
        "system_name": config.system_name,
        "company_name": config.company_name,
        "logo_path": config.logo_path,
        "primary_color": config.primary_color,
        "accent_color": config.accent_color,
        "work_days": config.work_days,
        "time_format": config.time_format,
        "entry_tolerance_minutes": config.entry_tolerance_minutes
    }

@router.put("")
def update_settings(
    data: SettingsUpdateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No tienes permisos para modificar la configuración.")
        
    config = db.query(SystemConfig).first()
    if not config:
        config = SystemConfig()
        db.add(config)
        
    config.system_name = data.system_name
    config.company_name = data.company_name
    config.primary_color = data.primary_color
    config.accent_color = data.accent_color
    config.work_days = data.work_days
    config.time_format = data.time_format
    config.entry_tolerance_minutes = data.entry_tolerance_minutes
    
    db.commit()
    db.refresh(config)
    return {"status": "success", "message": "Configuración actualizada correctamente."}

@router.post("/logo")
def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No tienes permisos para modificar el logotipo.")
        
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
