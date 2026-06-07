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
    tolerance_enable: bool
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
    flexible_shift_enable: bool
    flexible_shift_start: str
    flexible_shift_end: str
    smtp_host: Optional[str] = "smtp.gmail.com"
    smtp_port: Optional[int] = 587
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_use_tls: Optional[bool] = True
    email_notifications_enabled: Optional[bool] = False
    email_alerts_recipients: Optional[str] = None
    alert_device_offline: Optional[bool] = True
    alert_employee_lateness: Optional[bool] = True
    alert_admin_daily_report: Optional[bool] = True
    cleanup_enabled: Optional[bool] = False
    cleanup_time: Optional[str] = "02:00"
    retention_attendance_days: Optional[int] = 1825
    retention_audit_logs_days: Optional[int] = 365
    retention_sync_logs_days: Optional[int] = 30
    cleanup_attendance_enabled: Optional[bool] = True
    cleanup_audit_enabled: Optional[bool] = True
    cleanup_sync_enabled: Optional[bool] = True
    qr_badge_show_blood_type: Optional[bool] = True
    qr_badge_show_department: Optional[bool] = True
    mobile_qr_portal_enabled: Optional[bool] = False


class SettingsPatchSchema(BaseModel):
    system_name: Optional[str] = None
    company_name: Optional[str] = None
    primary_color: Optional[str] = None
    accent_color: Optional[str] = None
    bg_base_color: Optional[str] = None
    bg_surface_color: Optional[str] = None
    work_days: Optional[str] = None
    time_format: Optional[str] = None
    tolerance_enable: Optional[bool] = None
    entry_tolerance_minutes: Optional[int] = None
    exit_tolerance_minutes: Optional[int] = None
    require_checkin: Optional[bool] = None
    require_checkout: Optional[bool] = None
    mark_late_enable: Optional[bool] = None
    mark_late_limit_minutes: Optional[int] = None
    mark_absent_if_late_enable: Optional[bool] = None
    mark_absent_if_late_limit_minutes: Optional[int] = None
    mark_early_departure_enable: Optional[bool] = None
    mark_early_departure_limit_minutes: Optional[int] = None
    mark_absent_if_early_checkout_enable: Optional[bool] = None
    mark_absent_if_early_checkout_limit_minutes: Optional[int] = None
    no_checkin_enable: Optional[bool] = None
    no_checkin_status: Optional[str] = None
    no_checkout_enable: Optional[bool] = None
    no_checkout_status: Optional[str] = None
    flexible_shift_enable: Optional[bool] = None
    flexible_shift_start: Optional[str] = None
    flexible_shift_end: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_use_tls: Optional[bool] = None
    email_notifications_enabled: Optional[bool] = None
    email_alerts_recipients: Optional[str] = None
    alert_device_offline: Optional[bool] = None
    alert_employee_lateness: Optional[bool] = None
    alert_admin_daily_report: Optional[bool] = None
    cleanup_enabled: Optional[bool] = None
    cleanup_time: Optional[str] = None
    retention_attendance_days: Optional[int] = None
    retention_audit_logs_days: Optional[int] = None
    retention_sync_logs_days: Optional[int] = None
    cleanup_attendance_enabled: Optional[bool] = None
    cleanup_audit_enabled: Optional[bool] = None
    cleanup_sync_enabled: Optional[bool] = None
    qr_badge_show_blood_type: Optional[bool] = None
    qr_badge_show_department: Optional[bool] = None
    mobile_qr_portal_enabled: Optional[bool] = None


@router.get("/public")
def get_public_settings(db: Session = Depends(get_db)):
    """Devuelve solo los campos de branding seguros (sin autenticación, para la página de login)."""
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
        }
    return {
        "system_name": config.system_name,
        "company_name": config.company_name,
        "logo_path": config.logo_path,
        "primary_color": config.primary_color,
        "accent_color": config.accent_color,
        "bg_base_color": config.bg_base_color or "#f8fafc",
        "bg_surface_color": config.bg_surface_color or "#ffffff",
    }

@router.get("")
def get_settings(db: Session = Depends(get_db), _=Depends(get_current_user)):
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
            "tolerance_enable": True,
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
            "flexible_shift_enable": True,
            "flexible_shift_start": "09:00:00",
            "flexible_shift_end": "18:00:00",
            "smtp_host": "smtp.gmail.com",
            "smtp_port": 587,
            "smtp_username": "",
            "smtp_password": "",
            "smtp_use_tls": True,
            "email_notifications_enabled": False,
            "email_alerts_recipients": "",
            "alert_device_offline": True,
            "alert_employee_lateness": True,
            "alert_admin_daily_report": True,
            "cleanup_enabled": False,
            "cleanup_time": "02:00",
            "retention_attendance_days": 1825,
            "retention_audit_logs_days": 365,
            "retention_sync_logs_days": 30,
            "cleanup_attendance_enabled": True,
            "cleanup_audit_enabled": True,
            "cleanup_sync_enabled": True,
            "qr_badge_show_blood_type": True,
            "qr_badge_show_department": True,
            "mobile_qr_portal_enabled": False
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
        "tolerance_enable": config.tolerance_enable,
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
        "flexible_shift_enable": config.flexible_shift_enable,
        "flexible_shift_start": config.flexible_shift_start,
        "flexible_shift_end": config.flexible_shift_end,
        "smtp_host": config.smtp_host,
        "smtp_port": config.smtp_port,
        "smtp_username": config.smtp_username,
        "smtp_password": config.smtp_password,
        "smtp_use_tls": config.smtp_use_tls,
        "email_notifications_enabled": config.email_notifications_enabled,
        "email_alerts_recipients": config.email_alerts_recipients,
        "alert_device_offline": config.alert_device_offline,
        "alert_employee_lateness": config.alert_employee_lateness,
        "alert_admin_daily_report": config.alert_admin_daily_report,
        "cleanup_enabled": config.cleanup_enabled,
        "cleanup_time": config.cleanup_time,
        "retention_attendance_days": config.retention_attendance_days,
        "retention_audit_logs_days": config.retention_audit_logs_days,
        "retention_sync_logs_days": config.retention_sync_logs_days,
        "cleanup_attendance_enabled": config.cleanup_attendance_enabled,
        "cleanup_audit_enabled": config.cleanup_audit_enabled,
        "cleanup_sync_enabled": config.cleanup_sync_enabled,
        "qr_badge_show_blood_type": config.qr_badge_show_blood_type,
        "qr_badge_show_department": config.qr_badge_show_department,
        "mobile_qr_portal_enabled": config.mobile_qr_portal_enabled
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
    config.tolerance_enable = data.tolerance_enable
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
    config.flexible_shift_enable = data.flexible_shift_enable
    config.flexible_shift_start = data.flexible_shift_start
    config.flexible_shift_end = data.flexible_shift_end
    
    # Guardar campos SMTP
    config.smtp_host = data.smtp_host
    config.smtp_port = data.smtp_port
    config.smtp_username = data.smtp_username
    if data.smtp_password and data.smtp_password != '••••••••' and data.smtp_password.strip() != '':
        config.smtp_password = data.smtp_password
    config.smtp_use_tls = data.smtp_use_tls
    config.email_notifications_enabled = data.email_notifications_enabled
    config.email_alerts_recipients = data.email_alerts_recipients
    
    config.alert_device_offline = data.alert_device_offline
    config.alert_employee_lateness = data.alert_employee_lateness
    config.alert_admin_daily_report = data.alert_admin_daily_report
    
    config.cleanup_enabled = data.cleanup_enabled
    config.cleanup_time = data.cleanup_time
    config.retention_attendance_days = data.retention_attendance_days
    config.retention_audit_logs_days = data.retention_audit_logs_days
    config.retention_sync_logs_days = data.retention_sync_logs_days
    config.cleanup_attendance_enabled = data.cleanup_attendance_enabled
    config.cleanup_audit_enabled = data.cleanup_audit_enabled
    config.cleanup_sync_enabled = data.cleanup_sync_enabled
    config.qr_badge_show_blood_type = data.qr_badge_show_blood_type
    config.qr_badge_show_department = data.qr_badge_show_department
    config.mobile_qr_portal_enabled = data.mobile_qr_portal_enabled
    
    db.commit()
    db.refresh(config)

    from backend.services.audit import log_action
    log_action(db, current_user.id, "UPDATE", "SystemConfig", str(config.id), "Configuración general del sistema actualizada")

    return {"status": "success", "message": "Configuración actualizada correctamente."}


@router.patch("")
def patch_settings(
    data: SettingsPatchSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("perm_manage_settings"))
):
    config = db.query(SystemConfig).first()
    if not config:
        config = SystemConfig()
        db.add(config)
        db.commit()
        db.refresh(config)

    update_dict = data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        if field == "smtp_password":
            if value and value != '••••••••' and value.strip() != '':
                config.smtp_password = value
        else:
            setattr(config, field, value)
            
    db.commit()
    db.refresh(config)

    from backend.services.audit import log_action
    log_action(db, current_user.id, "UPDATE", "SystemConfig", str(config.id), "Configuración parcial del sistema actualizada")

    return {"status": "success", "message": "Configuración actualizada correctamente."}

@router.post("/manual-cleanup")
def manual_cleanup(
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("perm_manage_settings"))
):
    from backend.services.maintenance import cleanup_old_data
    config = db.query(SystemConfig).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuración no encontrada.")
    
    try:
        deleted_stats = cleanup_old_data(db, config)
        from backend.services.audit import log_action
        log_action(db, current_user.id, "DELETE", "System", "Cleanup", f"Limpieza manual ejecutada. Eliminados: {deleted_stats}")
        return {"status": "success", "message": "Limpieza manual ejecutada correctamente.", "stats": deleted_stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test-email")
def test_email(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("perm_manage_settings"))
):
    recipient = payload.get("recipient")
    if not recipient:
        raise HTTPException(status_code=400, detail="Por favor, especifica el correo destinatario de prueba.")
        
    config = db.query(SystemConfig).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuración no encontrada. Guarda los cambios primero.")
        
    try:
        from backend.services.email import send_test_email
        send_test_email(config, recipient)
        return {"status": "success", "message": f"Correo de prueba enviado con éxito a {recipient}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error de envío SMTP: {str(e)}")

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
