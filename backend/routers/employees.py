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
from backend.models import Department, Employee
from backend.schemas import EmployeeCreate, EmployeeOut, EmployeeUpdate, DepartmentCreate, DepartmentOut

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
    return emp


@router.put("/{emp_id}", response_model=EmployeeOut)
def update_employee(emp_id: int, data: EmployeeUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(emp, field, value)
    db.commit()
    db.refresh(emp)
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
