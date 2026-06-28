"""Router de empleados: CRUD + foto + sincronización con dispositivo."""
import logging

logger = logging.getLogger(__name__)

import os
import shutil
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.auth import get_current_user, check_permission, check_permission_or
require_admin = check_permission("perm_manage_employees")
require_view_employees = check_permission_or("perm_manage_employees", "perm_view_employees")
from backend.config import UPLOADS_DIR


from backend.database import get_db
from backend.models import Department, Position, Employee
from backend.schemas import (
    EmployeeCreate, EmployeeOut, EmployeeUpdate,
    DepartmentCreate, DepartmentOut,
    PositionCreate, PositionOut
)

router = APIRouter(prefix="/api/employees", tags=["employees"])


# ── Departamentos ─────────────────────────────────────────────────────────────

@router.get("/departments", response_model=list[DepartmentOut])
def list_departments(db: Session = Depends(get_db), _=Depends(require_view_employees)):
    return db.query(Department).order_by(Department.name).all()


@router.post("/departments", response_model=DepartmentOut, status_code=201)
def create_department(data: DepartmentCreate, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    if db.query(Department).filter(Department.name == data.name).first():
        raise HTTPException(status_code=400, detail="El departamento ya existe")
    dept = Department(**data.model_dump())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    
    from backend.services.audit import log_action
    log_action(db, current_user.id, "CREATE", "Department", str(dept.id), f"Creado departamento {dept.name}")
    
    return dept


@router.put("/departments/{dept_id}", response_model=DepartmentOut)
def update_department(dept_id: int, data: DepartmentCreate, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Departamento no encontrado")
    
    # Check duplicate name if name changed
    if data.name != dept.name:
        if db.query(Department).filter(Department.name == data.name).first():
            raise HTTPException(status_code=400, detail="El departamento ya existe")
            
    old_name = dept.name
    dept.name = data.name
    dept.description = data.description
    db.commit()
    db.refresh(dept)
    
    from backend.services.audit import log_action
    log_action(db, current_user.id, "UPDATE", "Department", str(dept.id), f"Actualizado departamento {old_name} -> {dept.name}")
    return dept


@router.delete("/departments/{dept_id}", status_code=204)
def delete_department(dept_id: int, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Departamento no encontrado")
    dept_name = dept.name
    db.delete(dept)
    db.commit()

    from backend.services.audit import log_action
    log_action(db, current_user.id, "DELETE", "Department", str(dept_id), f"Eliminado departamento {dept_name}")


# ── Cargos (Positions) ────────────────────────────────────────────────────────

@router.get("/positions", response_model=list[PositionOut])
def list_positions(db: Session = Depends(get_db), _=Depends(require_view_employees)):
    return db.query(Position).order_by(Position.name).all()


@router.post("/positions", response_model=PositionOut, status_code=201)
def create_position(data: PositionCreate, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    if db.query(Position).filter(Position.name == data.name).first():
        raise HTTPException(status_code=400, detail="El cargo ya existe")
    pos = Position(**data.model_dump())
    db.add(pos)
    db.commit()
    db.refresh(pos)
    
    from backend.services.audit import log_action
    log_action(db, current_user.id, "CREATE", "Position", str(pos.id), f"Creado cargo {pos.name}")
    
    return pos


@router.put("/positions/{pos_id}", response_model=PositionOut)
def update_position(pos_id: int, data: PositionCreate, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    pos = db.query(Position).filter(Position.id == pos_id).first()
    if not pos:
        raise HTTPException(status_code=404, detail="Cargo no encontrado")
        
    # Check duplicate name if name changed
    if data.name != pos.name:
        if db.query(Position).filter(Position.name == data.name).first():
            raise HTTPException(status_code=400, detail="El cargo ya existe")
            
    old_name = pos.name
    pos.name = data.name
    pos.description = data.description
    db.commit()
    db.refresh(pos)
    
    from backend.services.audit import log_action
    log_action(db, current_user.id, "UPDATE", "Position", str(pos.id), f"Actualizado cargo {old_name} -> {pos.name}")
    return pos


@router.delete("/positions/{pos_id}", status_code=204)
def delete_position(pos_id: int, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    pos = db.query(Position).filter(Position.id == pos_id).first()
    if not pos:
        raise HTTPException(status_code=404, detail="Cargo no encontrado")
    pos_name = pos.name
    db.delete(pos)
    db.commit()

    from backend.services.audit import log_action
    log_action(db, current_user.id, "DELETE", "Position", str(pos_id), f"Eliminado cargo {pos_name}")


# ── Empleados ─────────────────────────────────────────────────────────────────

@router.get("", response_model=list[EmployeeOut])
def list_employees(
    search: Optional[str] = Query(None),
    department_id: Optional[int] = Query(None),
    position_id: Optional[int] = Query(None),
    schedule_id: Optional[str] = Query(None),
    shift_type: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _=Depends(require_view_employees),
):
    from sqlalchemy.orm import joinedload
    q = db.query(Employee).options(
        joinedload(Employee.department),
        joinedload(Employee.position),
        joinedload(Employee.schedule)
    )
    if search:
        like = f"%{search}%"
        q = q.filter(
            Employee.first_name.ilike(like) |
            Employee.last_name.ilike(like) |
            Employee.employee_code.ilike(like)
        )
    if department_id:
        q = q.filter(Employee.department_id == department_id)
    if position_id:
        q = q.filter(Employee.position_id == position_id)
    if schedule_id:
        if schedule_id == "none":
            q = q.filter(Employee.schedule_id == None)
        else:
            try:
                q = q.filter(Employee.schedule_id == int(schedule_id))
            except ValueError:
                pass
    if shift_type:
        from backend.models import Schedule
        q = q.join(Employee.schedule).filter(Schedule.shift_type == shift_type)
    if is_active is not None:
        q = q.filter(Employee.is_active == is_active)
    return q.order_by(Employee.last_name).offset(skip).limit(limit).all()


@router.get("/device-capture")
def capture_photo_from_device(db: Session = Depends(get_db), _=Depends(require_admin)):
    """Captura una foto de rostro en tiempo real usando la cámara del biométrico Hikvision."""
    from backend.models import DeviceConfig
    import requests
    from requests.auth import HTTPDigestAuth
    from fastapi import Response

    cfg = db.query(DeviceConfig).first()
    if not cfg:
        raise HTTPException(status_code=400, detail="Configuración del dispositivo no encontrada")

    url = f"http://{cfg.ip_address}:{cfg.port}/ISAPI/Streaming/channels/101/picture"
    try:
        r = requests.get(
            url,
            auth=HTTPDigestAuth(cfg.username, cfg.password),
            timeout=8
        )
        if r.status_code == 200:
            return Response(content=r.content, media_type="image/jpeg")
        else:
            raise HTTPException(status_code=r.status_code, detail=f"El biométrico devolvió error: {r.status_code}")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"No se pudo conectar con el biométrico: {str(e)}")


@router.get("/{emp_id}", response_model=EmployeeOut)
def get_employee(emp_id: int, db: Session = Depends(get_db), _=Depends(require_view_employees)):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return emp


@router.post("", response_model=EmployeeOut, status_code=201)
def create_employee(data: EmployeeCreate, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    if db.query(Employee).filter(Employee.employee_code == data.employee_code).first():
        raise HTTPException(status_code=400, detail="El código de empleado ya existe")
        
    if data.qr_enabled and not data.card_number:
        import random
        data.card_number = str(random.randint(10000000, 99999999))

    emp = Employee(**data.model_dump())
    db.add(emp)
    db.commit()
    db.refresh(emp)

    from backend.services.audit import log_action
    log_action(db, current_user.id, "CREATE", "Employee", str(emp.id), f"Creado empleado {emp.employee_code} ({emp.full_name})")

    # Sincronizar automáticamente con el dispositivo si está online
    try:
        from backend.models import DeviceConfig
        from backend.services.hikvision import HikvisionClient
        
        cfg = db.query(DeviceConfig).first()
        if cfg:
            client = HikvisionClient(cfg.ip_address, cfg.port, cfg.username, cfg.password)
            if client.check_online():
                device_uid = emp.employee_code
                client.create_user(device_uid, emp.full_name, emp.card_number)
                emp.device_user_id = device_uid
                emp.synced_to_device = True
                db.commit()
                db.refresh(emp)
    except Exception as e:
        logger.error(f"Error en auto-sincronizacion de nuevo empleado al dispositivo: {e}")

    return emp


import random

@router.post("/bulk-qr-generate")
def bulk_qr_generate(db: Session = Depends(get_db), current_user=Depends(require_admin)):
    employees = db.query(Employee).filter(
        (Employee.qr_enabled == False) | (Employee.card_number == None) | (Employee.card_number == "")
    ).all()
    
    count = 0
    for emp in employees:
        emp.qr_enabled = True
        emp.card_number = str(random.randint(1000000000, 9999999999))
        count += 1
        
    db.commit()
    from backend.services.audit import log_action
    log_action(db, current_user.id, "UPDATE", "Employee", "Bulk", f"Generados QRs masivamente para {count} empleados")
    return {"status": "success", "message": f"Se han generado y habilitado QRs para {count} empleados.", "generated_count": count}

@router.post("/{emp_id}/regenerate-qr")
def regenerate_qr(emp_id: int, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
        
    old_card = emp.card_number
    emp.qr_enabled = True
    emp.card_number = str(random.randint(1000000000, 9999999999))
    db.commit()
    db.refresh(emp)
    
    from backend.services.audit import log_action
    log_action(db, current_user.id, "UPDATE", "Employee", str(emp.id), f"QR regenerado. Anterior: {old_card}, Nuevo: {emp.card_number}")
    
    # Sincronizar automáticamente con el dispositivo si está online
    try:
        from backend.models import DeviceConfig
        from backend.services.hikvision import HikvisionClient
        cfg = db.query(DeviceConfig).first()
        if cfg:
            client = HikvisionClient(cfg.ip_address, cfg.port, cfg.username, cfg.password)
            if client.check_online() and emp.device_user_id:
                client.create_user(emp.device_user_id, emp.full_name, emp.card_number)
                emp.synced_to_device = True
                db.commit()
    except Exception as e:
        logger.error(f"Error en sincronizacion de regeneración de QR: {e}")
        
    return {"status": "success", "message": "Código QR regenerado exitosamente", "new_card_number": emp.card_number}

from pydantic import BaseModel
from typing import List

class BulkUpdateInput(BaseModel):
    employee_ids: List[int]
    department_id: Optional[int] = None
    schedule_id: Optional[int] = None

class BulkActionInput(BaseModel):
    employee_ids: List[int]

@router.put("/bulk-update")
def bulk_update_employees(
    data: BulkUpdateInput,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):
    if not data.employee_ids:
        raise HTTPException(status_code=400, detail="Debe seleccionar al menos un empleado")
    
    fields = data.model_dump(exclude_unset=True)

    if fields.get("department_id") is not None:
        dept = db.query(Department).filter(Department.id == fields["department_id"]).first()
        if not dept:
            raise HTTPException(status_code=404, detail="Departamento no encontrado")

    if fields.get("schedule_id") is not None:
        from backend.models import Schedule
        sched = db.query(Schedule).filter(Schedule.id == fields["schedule_id"]).first()
        if not sched:
            raise HTTPException(status_code=404, detail="Horario no encontrado")

    employees = db.query(Employee).filter(Employee.id.in_(data.employee_ids)).all()
    if not employees:
        raise HTTPException(status_code=404, detail="Ninguno de los empleados seleccionados fue encontrado")

    device_online = False
    client = None
    try:
        from backend.models import DeviceConfig
        from backend.services.hikvision import HikvisionClient
        
        cfg = db.query(DeviceConfig).first()
        if cfg:
            client = HikvisionClient(cfg.ip_address, cfg.port, cfg.username, cfg.password)
            device_online = client.check_online()
    except Exception:
        pass

    if "schedule_id" in fields:
        from datetime import date
        from backend.models import EmployeeDailySchedule
        today = date.today()
        db.query(EmployeeDailySchedule).filter(
            EmployeeDailySchedule.employee_id.in_([emp.id for emp in employees]),
            EmployeeDailySchedule.date >= today
        ).delete(synchronize_session=False)

    for emp in employees:
        if "department_id" in fields:
            emp.department_id = fields["department_id"]
        if "schedule_id" in fields:
            emp.schedule_id = fields["schedule_id"]
            
        if device_online and client:
            try:
                device_uid = emp.device_user_id or emp.employee_code
                client.create_user(device_uid, emp.full_name, emp.card_number)
                emp.device_user_id = device_uid
                emp.synced_to_device = True
            except Exception:
                emp.synced_to_device = False
        else:
            emp.synced_to_device = False

    db.commit()

    from backend.services.audit import log_action
    emp_codes_names = [f"{emp.employee_code} ({emp.full_name})" for emp in employees]
    log_action(db, current_user.id, "UPDATE", "Employee", None, f"Actualizados en lote {len(employees)} empleados: {', '.join(emp_codes_names)}")

    return {"status": "success", "updated_count": len(employees)}


@router.put("/{emp_id}", response_model=EmployeeOut)
def update_employee(emp_id: int, data: EmployeeUpdate, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    
    fields = data.model_dump(exclude_unset=True)
    
    if "qr_enabled" in fields:
        if fields["qr_enabled"] and not emp.card_number and not fields.get("card_number"):
            import random
            fields["card_number"] = str(random.randint(10000000, 99999999))
        elif not fields["qr_enabled"]:
            fields["card_number"] = None

    if "schedule_id" in fields:
        from datetime import date
        from backend.models import EmployeeDailySchedule
        today = date.today()
        db.query(EmployeeDailySchedule).filter(
            EmployeeDailySchedule.employee_id == emp_id,
            EmployeeDailySchedule.date >= today
        ).delete(synchronize_session=False)

    for field, value in fields.items():
        setattr(emp, field, value)
    db.commit()
    db.refresh(emp)

    from backend.services.audit import log_action
    log_action(db, current_user.id, "UPDATE", "Employee", str(emp.id), f"Actualizado empleado {emp.employee_code}")

    # Sincronizar automáticamente la actualización con el dispositivo
    try:
        from backend.models import DeviceConfig
        from backend.services.hikvision import HikvisionClient
        
        cfg = db.query(DeviceConfig).first()
        if cfg:
            client = HikvisionClient(cfg.ip_address, cfg.port, cfg.username, cfg.password)
            if client.check_online():
                device_uid = emp.device_user_id or emp.employee_code
                client.create_user(device_uid, emp.full_name, emp.card_number)
                emp.device_user_id = device_uid
                emp.synced_to_device = True
                db.commit()
                db.refresh(emp)
    except Exception as e:
        logger.error(f"Error en auto-sincronizacion al actualizar empleado: {e}")

    return emp


@router.delete("/{emp_id}", status_code=204)
def delete_employee(emp_id: int, db: Session = Depends(get_db), current_user=Depends(require_admin)):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    # 1. Eliminar foto local si existe
    if emp.photo_path:
        try:
            path = UPLOADS_DIR.parent / emp.photo_path
            if path.exists():
                path.unlink()
                logger.info(f"Foto de perfil eliminada localmente: {path}")
        except Exception as e:
            logger.error(f"Error al eliminar la foto de perfil del empleado {emp.employee_code}: {e}")

    # 2. Sincronizar la eliminación con el dispositivo biométrico si está online
    try:
        from backend.models import DeviceConfig
        from backend.services.hikvision import HikvisionClient
        
        cfg = db.query(DeviceConfig).first()
        if cfg:
            client = HikvisionClient(cfg.ip_address, cfg.port, cfg.username, cfg.password)
            if client.check_online():
                device_uid = emp.device_user_id or emp.employee_code
                if device_uid:
                    client.delete_user(device_uid)
                    logger.info(f"Empleado {emp.first_name} {emp.last_name} ({device_uid}) eliminado del dispositivo biométrico.")
    except Exception as e:
        logger.error(f"Error en la eliminación automática del empleado {emp.employee_code} del dispositivo: {e}")

    # 3. Eliminar de la base de datos
    emp_code = emp.employee_code
    emp_name = emp.full_name
    db.delete(emp)
    db.commit()

    from backend.services.audit import log_action
    log_action(db, current_user.id, "DELETE", "Employee", str(emp_id), f"Eliminado empleado {emp_code} ({emp_name})")


# ── Foto ──────────────────────────────────────────────────────────────────────

@router.post("/{emp_id}/photo")
async def upload_photo(
    emp_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Solo se permiten imágenes")

    try:
        from PIL import Image
        import io
        
        # Leer los bytes de la imagen subida
        img_bytes = await file.read()
        img = Image.open(io.BytesIO(img_bytes))
        
        # Convertir a RGB (necesario para guardar como JPEG y quitar canal alfa de PNG)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
            
        # Redimensionar si es muy grande (máximo 800px de ancho/alto)
        max_size = (800, 800)
        img.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        # Guardar en disco como JPEG con calidad 85 y optimizado
        filename = f"{emp.employee_code}.jpg"
        dest = UPLOADS_DIR / filename
        img.save(dest, format="JPEG", quality=85, optimize=True)
    except Exception as img_err:
        raise HTTPException(status_code=400, detail=f"Error al procesar la imagen: {img_err}")

    emp.photo_path = f"faces/{filename}"
    db.commit()

    # Sincronizar automáticamente la foto de perfil con el biométrico
    try:
        from backend.models import DeviceConfig
        from backend.services.hikvision import HikvisionClient
        
        cfg = db.query(DeviceConfig).first()
        if cfg:
            client = HikvisionClient(cfg.ip_address, cfg.port, cfg.username, cfg.password)
            if client.check_online():
                device_uid = emp.device_user_id or emp.employee_code
                
                # Si el empleado no está sincronizado al biométrico, registrar sus datos primero
                if not emp.synced_to_device:
                    try:
                        client.create_user(device_uid, emp.full_name, emp.card_number)
                        emp.device_user_id = device_uid
                        emp.synced_to_device = True
                        db.commit()
                        logger.info(f"Empleado {emp.employee_code} pre-registrado en el biométrico para subir foto.")
                    except Exception as create_err:
                        logger.error(f"Error al registrar empleado en biométrico durante subida de foto: {create_err}")
                
                with open(dest, "rb") as image_file:
                    photo_bytes = image_file.read()
                client.upload_face_photo(device_uid, photo_bytes)
                logger.info(f"Foto de {emp.employee_code} auto-sincronizada con éxito al biométrico.")
    except Exception as e:
        error_msg = f"Fallo al sincronizar con el biométrico: {str(e)}"
        logger.error(error_msg)
        raise HTTPException(status_code=400, detail=error_msg)

    return {"photo_path": emp.photo_path}


@router.get("/{emp_id}/photo")
def get_photo(emp_id: int, db: Session = Depends(get_db), _=Depends(require_view_employees)):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp or not emp.photo_path:
        raise HTTPException(status_code=404, detail="Sin foto")
    path = UPLOADS_DIR.parent / emp.photo_path
    if not path.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    return FileResponse(str(path))


# ── Sincronización con dispositivo ───────────────────────────────────────────

@router.post("/{emp_id}/sync-to-device")
def sync_employee_to_device(emp_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    from backend.models import DeviceConfig
    from backend.services.hikvision import HikvisionClient

    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    cfg = db.query(DeviceConfig).first()
    if not cfg:
        raise HTTPException(status_code=503, detail="No hay configuración de dispositivo")

    client = HikvisionClient(cfg.ip_address, cfg.port, cfg.username, cfg.password)
    if not client.check_online():
        raise HTTPException(status_code=503, detail="Dispositivo fuera de línea")

    device_uid = emp.device_user_id or emp.employee_code
    try:
        client.create_user(device_uid, emp.full_name, emp.card_number)
        emp.device_user_id = device_uid
        emp.synced_to_device = True
        db.commit()
        return {"ok": True, "device_user_id": device_uid}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al sincronizar: {str(e)}")


@router.post("/import-from-device")
def import_employees_from_device(db: Session = Depends(get_db), _=Depends(require_admin)):
    from backend.models import DeviceConfig
    from backend.services.hikvision import HikvisionClient
    import requests
    from requests.auth import HTTPDigestAuth

    cfg = db.query(DeviceConfig).first()
    if not cfg:
        raise HTTPException(status_code=503, detail="No hay configuración de dispositivo")

    client = HikvisionClient(cfg.ip_address, cfg.port, cfg.username, cfg.password)
    if not client.check_online():
        raise HTTPException(status_code=503, detail="Dispositivo fuera de línea")

    try:
        # Traer usuarios en páginas de 50 con manejo de reintentos por rate-limit y paginación real
        import time
        user_list = []
        start_pos = 1
        limit = 50
        search_id = None
        while True:
            users_page = None
            for attempt in range(3):
                try:
                    res = client.list_users(start=start_pos, limit=limit, search_id=search_id)
                    search_data = res.get("UserInfoSearchRet") or res.get("UserInfoSearch", {})
                    users_page = search_data.get("UserInfo", [])
                    if not search_id and users_page:
                        search_id = search_data.get("searchID")
                    break  # Éxito
                except Exception as e:
                    logger.error(f"Error importando página (intento {attempt+1}): {e}")
                    time.sleep(1)
            
            if users_page is None:
                raise HTTPException(status_code=502, detail="Fallo repetido al comunicarse con el biométrico")
                
            if not users_page:
                break
                
            user_list.extend(users_page)
            total_matches = search_data.get("totalMatches", 0)
            if len(user_list) >= total_matches:
                break
            start_pos += len(users_page)
            time.sleep(0.1)  # Pequeña pausa para no saturar el dispositivo

        imported_count = 0
        updated_count = 0
        photos_imported = 0
        
        for u in user_list:
            device_uid = str(u.get("employeeNo"))
            name = u.get("name", "Empleado")
            face_url = u.get("faceURL")
            
            # Obtener número de tarjeta si tiene
            card_info = u.get("CardInfo", [])
            card_number = card_info[0].get("cardNo") if card_info else None
            
            # Dividir primer nombre y apellido
            parts = name.strip().split(" ", 1)
            if len(parts) == 2:
                first_name, last_name = parts[0], parts[1]
            else:
                first_name, last_name = parts[0], "-"
            
            # Buscar si ya existe por device_user_id o employee_code
            emp = db.query(Employee).filter(
                (Employee.device_user_id == device_uid) | 
                (Employee.employee_code == device_uid)
            ).first()
            
            if emp:
                # Actualizar información
                emp.device_user_id = device_uid
                emp.first_name = first_name
                emp.last_name = last_name
                if card_number:
                    emp.card_number = card_number
                emp.synced_to_device = True
                updated_count += 1
            else:
                # Crear nuevo empleado con el horario de 7:00 AM a 6:00 PM por defecto
                emp = Employee(
                    employee_code=device_uid,
                    device_user_id=device_uid,
                    first_name=first_name,
                    last_name=last_name,
                    card_number=card_number,
                    synced_to_device=True,
                    is_active=True,
                    work_start_time="07:00",
                    work_end_time="18:00",
                )
                db.add(emp)
                imported_count += 1
            
            # Descargar foto de rostro del dispositivo si existe
            if face_url:
                try:
                    r = requests.get(
                        face_url,
                        auth=HTTPDigestAuth(cfg.username, cfg.password),
                        timeout=10
                    )
                    if r.status_code == 200:
                        filename = f"{emp.employee_code}.jpg"
                        dest = UPLOADS_DIR / filename
                        with open(dest, "wb") as f:
                            f.write(r.content)
                        emp.photo_path = f"faces/{filename}"
                        photos_imported += 1
                except Exception as img_err:
                    logger.error(f"Error al descargar foto para {device_uid} durante importación: {img_err}")
                
        db.commit()
        return {
            "status": "success",
            "imported": imported_count,
            "updated": updated_count,
            "photos_imported": photos_imported,
            "total_device_users": len(user_list)
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al importar desde el dispositivo: {str(e)}")


@router.post("/bulk-sync")
def bulk_sync_employees(
    data: BulkActionInput,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):
    if not data.employee_ids:
        raise HTTPException(status_code=400, detail="Debe seleccionar al menos un empleado")

    from backend.models import DeviceConfig
    from backend.services.hikvision import HikvisionClient

    cfg = db.query(DeviceConfig).first()
    if not cfg:
        raise HTTPException(status_code=503, detail="No hay configuración de dispositivo")

    client = HikvisionClient(cfg.ip_address, cfg.port, cfg.username, cfg.password)
    if not client.check_online():
        raise HTTPException(status_code=503, detail="El dispositivo biométrico está fuera de línea")

    employees = db.query(Employee).filter(Employee.id.in_(data.employee_ids)).all()
    synced = 0
    failed = 0
    emp_details = []

    for emp in employees:
        try:
            device_uid = emp.device_user_id or emp.employee_code
            
            client.create_user(device_uid, emp.full_name, emp.card_number)
            emp.device_user_id = device_uid
            emp.synced_to_device = True
            db.commit()

            if emp.photo_path:
                dest = UPLOADS_DIR / f"{emp.employee_code}.jpg"
                if dest.exists():
                    with open(dest, "rb") as image_file:
                        photo_bytes = image_file.read()
                    client.upload_face_photo(device_uid, photo_bytes)
            
            synced += 1
            emp_details.append(f"{emp.employee_code} ({emp.full_name})")
        except Exception as e:
            failed += 1
            logger.error(f"Error al sincronizar empleado {emp.employee_code} en lote: {e}")

    db.commit()

    from backend.services.audit import log_action
    log_action(db, current_user.id, "SYNC", "Employee", None, f"Sincronizados en lote {synced} empleados con el biométrico (Fallidos: {failed}): {', '.join(emp_details)}")

    return {"status": "success", "synced": synced, "failed": failed}


@router.post("/bulk-delete")
def bulk_delete_employees(
    data: BulkActionInput,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):
    if not data.employee_ids:
        raise HTTPException(status_code=400, detail="Debe seleccionar al menos un empleado")

    employees = db.query(Employee).filter(Employee.id.in_(data.employee_ids)).all()
    if not employees:
        raise HTTPException(status_code=404, detail="Ninguno de los empleados seleccionados fue encontrado")

    device_online = False
    client = None
    try:
        from backend.models import DeviceConfig
        from backend.services.hikvision import HikvisionClient
        
        cfg = db.query(DeviceConfig).first()
        if cfg:
            client = HikvisionClient(cfg.ip_address, cfg.port, cfg.username, cfg.password)
            device_online = client.check_online()
    except Exception:
        pass

    emp_details = [f"{emp.employee_code} ({emp.full_name})" for emp in employees]
    deleted_count = 0
    for emp in employees:
        if emp.photo_path:
            try:
                path = UPLOADS_DIR.parent / emp.photo_path
                if path.exists():
                    path.unlink()
            except Exception as e:
                logger.error(f"Error al eliminar foto local en lote para {emp.employee_code}: {e}")

        if device_online and client:
            try:
                device_uid = emp.device_user_id or emp.employee_code
                if device_uid:
                    client.delete_user(device_uid)
            except Exception as e:
                logger.error(f"Error al eliminar de biométrico en lote para {emp.employee_code}: {e}")

        db.delete(emp)
        deleted_count += 1

    db.commit()

    from backend.services.audit import log_action
    log_action(db, current_user.id, "DELETE", "Employee", None, f"Eliminados en lote {deleted_count} empleados: {', '.join(emp_details)}")

    return {"status": "success", "deleted_count": deleted_count}


# ── Perfil de Asistencia por Empleado ─────────────────────────────────────────

@router.get("/{employee_id}/attendance-summary")
def get_employee_attendance_summary(
    employee_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_view_employees)
):
    """Retorna resumen de asistencia de los últimos 30 días y los últimos 20 registros para el modal de perfil."""
    from datetime import date, timedelta
    from backend.models import AttendanceRecord
    from backend.services.attendance_processor import process_attendance_report
    from backend.utils import get_local_now

    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    today = get_local_now().date()
    date_from = today - timedelta(days=29)

    # Últimos 30 días de resumen procesado
    summaries = process_attendance_report(
        db=db,
        date_from=date_from,
        date_to=today,
        employee_id=employee_id,
        granularity="daily"
    )

    days_present = sum(1 for s in summaries if s["is_present"])
    days_late = sum(1 for s in summaries if s["is_late"])
    days_absent = sum(1 for s in summaries if not s["is_present"])
    total_days = len(summaries)
    attendance_rate = round((days_present / total_days * 100) if total_days else 0, 1)

    # Sumar horas trabajadas del período
    total_hours = sum(s["hours_worked"] for s in summaries if s.get("hours_worked"))
    avg_hours_per_day = round(total_hours / days_present, 2) if days_present else 0

    # Últimos 20 registros RAW del dispositivo
    raw_records = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.employee_id == employee_id)
        .order_by(AttendanceRecord.event_time.desc())
        .limit(20)
        .all()
    )

    recent_records = []
    for r in raw_records:
        recent_records.append({
            "event_time": r.event_time.isoformat(),
            "event_type": r.event_type,
            "auth_method": r.auth_method or "-",
            "is_late": r.is_late,
        })

    return {
        "employee": {
            "id": emp.id,
            "employee_code": emp.employee_code,
            "full_name": emp.full_name,
            "department": emp.department.name if emp.department else "-",
            "position": emp.position.name if emp.position else "-",
            "schedule": emp.schedule.name if emp.schedule else "Sin horario",
            "photo_path": emp.photo_path,
            "is_active": emp.is_active,
        },
        "period": {
            "date_from": date_from.isoformat(),
            "date_to": today.isoformat(),
        },
        "stats": {
            "total_days": total_days,
            "days_present": days_present,
            "days_absent": days_absent,
            "days_late": days_late,
            "attendance_rate": attendance_rate,
            "total_hours_worked": round(total_hours, 2),
            "avg_hours_per_day": avg_hours_per_day,
        },
        "recent_records": recent_records,
    }
