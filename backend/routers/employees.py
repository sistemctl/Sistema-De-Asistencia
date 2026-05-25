"""Router de empleados: CRUD + foto + sincronización con dispositivo."""
import os
import shutil
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.auth import get_current_user, require_admin
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
def list_departments(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Department).order_by(Department.name).all()


@router.post("/departments", response_model=DepartmentOut, status_code=201)
def create_department(data: DepartmentCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if db.query(Department).filter(Department.name == data.name).first():
        raise HTTPException(status_code=400, detail="El departamento ya existe")
    dept = Department(**data.model_dump())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


@router.delete("/departments/{dept_id}", status_code=204)
def delete_department(dept_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Departamento no encontrado")
    db.delete(dept)
    db.commit()


# ── Cargos (Positions) ────────────────────────────────────────────────────────

@router.get("/positions", response_model=list[PositionOut])
def list_positions(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Position).order_by(Position.name).all()


@router.post("/positions", response_model=PositionOut, status_code=201)
def create_position(data: PositionCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if db.query(Position).filter(Position.name == data.name).first():
        raise HTTPException(status_code=400, detail="El cargo ya existe")
    pos = Position(**data.model_dump())
    db.add(pos)
    db.commit()
    db.refresh(pos)
    return pos


@router.delete("/positions/{pos_id}", status_code=204)
def delete_position(pos_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    pos = db.query(Position).filter(Position.id == pos_id).first()
    if not pos:
        raise HTTPException(status_code=404, detail="Cargo no encontrado")
    db.delete(pos)
    db.commit()


# ── Empleados ─────────────────────────────────────────────────────────────────

@router.get("", response_model=list[EmployeeOut])
def list_employees(
    search: Optional[str] = Query(None),
    department_id: Optional[int] = Query(None),
    is_active: Optional[bool] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(Employee)
    if search:
        like = f"%{search}%"
        q = q.filter(
            Employee.first_name.ilike(like) |
            Employee.last_name.ilike(like) |
            Employee.employee_code.ilike(like)
        )
    if department_id:
        q = q.filter(Employee.department_id == department_id)
    if is_active is not None:
        q = q.filter(Employee.is_active == is_active)
    return q.order_by(Employee.last_name).offset(skip).limit(limit).all()


@router.get("/{emp_id}", response_model=EmployeeOut)
def get_employee(emp_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return emp


@router.post("", response_model=EmployeeOut, status_code=201)
def create_employee(data: EmployeeCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if db.query(Employee).filter(Employee.employee_code == data.employee_code).first():
        raise HTTPException(status_code=400, detail="El código de empleado ya existe")
    emp = Employee(**data.model_dump())
    db.add(emp)
    db.commit()
    db.refresh(emp)

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
        print(f"Error en auto-sincronizacion de nuevo empleado al dispositivo: {e}")

    return emp


@router.put("/{emp_id}", response_model=EmployeeOut)
def update_employee(emp_id: int, data: EmployeeUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(emp, field, value)
    db.commit()
    db.refresh(emp)

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
        print(f"Error en auto-sincronizacion al actualizar empleado: {e}")

    return emp


@router.delete("/{emp_id}", status_code=204)
def delete_employee(emp_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    db.delete(emp)
    db.commit()


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

    ext = file.filename.rsplit(".", 1)[-1].lower()
    filename = f"{emp.employee_code}.{ext}"
    dest = UPLOADS_DIR / filename

    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

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
                with open(dest, "rb") as image_file:
                    photo_bytes = image_file.read()
                client.upload_face_photo(device_uid, photo_bytes)
                print(f"Foto de {emp.employee_code} auto-sincronizada con éxito al biométrico.")
    except Exception as e:
        print(f"Error en auto-sincronizacion de foto de perfil al biométrico: {e}")

    return {"photo_path": emp.photo_path}


@router.get("/{emp_id}/photo")
def get_photo(emp_id: int, db: Session = Depends(get_db)):
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

    device_uid = emp.device_user_id or str(emp.id)
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

    cfg = db.query(DeviceConfig).first()
    if not cfg:
        raise HTTPException(status_code=503, detail="No hay configuración de dispositivo")

    client = HikvisionClient(cfg.ip_address, cfg.port, cfg.username, cfg.password)
    if not client.check_online():
        raise HTTPException(status_code=503, detail="Dispositivo fuera de línea")

    try:
        # Traer usuarios en páginas de 30 con manejo de reintentos por rate-limit
        import time
        user_list = []
        start_pos = 1
        limit = 30
        while True:
            users_page = None
            for attempt in range(3):
                try:
                    res = client.list_users(start=start_pos, limit=limit)
                    search_data = res.get("UserInfoSearchRet") or res.get("UserInfoSearch", {})
                    users_page = search_data.get("UserInfo", [])
                    break  # Éxito
                except Exception as e:
                    print(f"Error importando página (intento {attempt+1}): {e}")
                    time.sleep(1)
            
            if users_page is None:
                raise HTTPException(status_code=502, detail="Fallo repetido al comunicarse con el biométrico")
                
            if not users_page:
                break
                
            user_list.extend(users_page)
            if len(users_page) < limit:
                break
            start_pos += limit
            time.sleep(0.2)  # Pequeña pausa para no saturar el dispositivo
        
        imported_count = 0
        updated_count = 0
        
        for u in user_list:
            device_uid = str(u.get("employeeNo"))
            name = u.get("name", "Empleado")
            
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
                new_emp = Employee(
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
                db.add(new_emp)
                imported_count += 1
                
        db.commit()
        return {
            "status": "success",
            "imported": imported_count,
            "updated": updated_count,
            "total_device_users": len(user_list)
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al importar desde el dispositivo: {str(e)}")

