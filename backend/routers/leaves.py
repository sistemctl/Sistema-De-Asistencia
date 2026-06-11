from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from backend.database import get_db
from backend.models import EmployeeLeave, Employee
from backend.schemas import LeaveOut, LeaveCreate, LeaveUpdate
from backend.auth import get_current_user, check_permission, check_permission_or

# Permitimos a los gestores de empleados administrar novedades (vacaciones/incapacidades)
require_manage_leaves = check_permission("perm_manage_employees")
require_view_leaves = check_permission_or("perm_manage_employees", "perm_view_employees")

router = APIRouter(prefix="/api/leaves", tags=["leaves"])

@router.get("", response_model=List[LeaveOut])
def get_leaves(
    employee_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    leave_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(require_view_leaves)
):
    """Obtiene el listado de novedades (vacaciones, incapacidades, licencias, etc.)."""
    query = db.query(EmployeeLeave)
    
    if employee_id:
        query = query.filter(EmployeeLeave.employee_id == employee_id)
    if date_from:
        query = query.filter(EmployeeLeave.end_date >= date_from)
    if date_to:
        query = query.filter(EmployeeLeave.start_date <= date_to)
    if leave_type:
        query = query.filter(EmployeeLeave.leave_type == leave_type)
        
    return query.order_by(EmployeeLeave.start_date.desc()).all()


@router.post("", response_model=LeaveOut, status_code=201)
def create_leave(
    data: LeaveCreate,
    db: Session = Depends(get_db),
    _=Depends(require_manage_leaves)
):
    """Registra una nueva novedad (vacaciones, incapacidad, etc.) con validación de traslapes."""
    # Verificar si el empleado existe
    emp = db.query(Employee).filter(Employee.id == data.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    # Validar traslapes de fechas para el mismo empleado
    overlap = db.query(EmployeeLeave).filter(
        EmployeeLeave.employee_id == data.employee_id,
        EmployeeLeave.start_date <= data.end_date,
        EmployeeLeave.end_date >= data.start_date
    ).first()
    if overlap:
        type_trans = {
            "vacation": "Vacaciones",
            "medical": "Incapacidad Médica",
            "paid_leave": "Licencia Remunerada",
            "unpaid_leave": "Licencia No Remunerada",
            "suspension": "Suspensión"
        }.get(overlap.leave_type, overlap.leave_type)
        raise HTTPException(
            status_code=400,
            detail=f"El empleado ya tiene una novedad registrada ('{type_trans}') entre {overlap.start_date} y {overlap.end_date}"
        )

    leave = EmployeeLeave(
        employee_id=data.employee_id,
        leave_type=data.leave_type,
        start_date=data.start_date,
        end_date=data.end_date,
        description=data.description
    )
    db.add(leave)
    db.commit()
    db.refresh(leave)
    return leave


@router.put("/{leave_id}", response_model=LeaveOut)
def update_leave(
    leave_id: int,
    data: LeaveUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_manage_leaves)
):
    """Actualiza una novedad existente, validando posibles traslapes."""
    leave = db.query(EmployeeLeave).filter(EmployeeLeave.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Novedad no encontrada")

    fields = data.model_dump(exclude_unset=True)
    
    # Si cambian fechas, validar traslapes excluyendo esta misma novedad
    new_start = fields.get("start_date", leave.start_date)
    new_end = fields.get("end_date", leave.end_date)
    
    if "start_date" in fields or "end_date" in fields:
        overlap = db.query(EmployeeLeave).filter(
            EmployeeLeave.employee_id == leave.employee_id,
            EmployeeLeave.id != leave_id,
            EmployeeLeave.start_date <= new_end,
            EmployeeLeave.end_date >= new_start
        ).first()
        if overlap:
            type_trans = {
                "vacation": "Vacaciones",
                "medical": "Incapacidad Médica",
                "paid_leave": "Licencia Remunerada",
                "unpaid_leave": "Licencia No Remunerada",
                "suspension": "Suspensión"
            }.get(overlap.leave_type, overlap.leave_type)
            raise HTTPException(
                status_code=400,
                detail=f"El empleado ya tiene otra novedad registrada ('{type_trans}') entre {overlap.start_date} y {overlap.end_date}"
            )

    for field, value in fields.items():
        setattr(leave, field, value)
        
    db.commit()
    db.refresh(leave)
    return leave


@router.delete("/{leave_id}", status_code=204)
def delete_leave(
    leave_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_manage_leaves)
):
    """Elimina una novedad del sistema."""
    leave = db.query(EmployeeLeave).filter(EmployeeLeave.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Novedad no encontrada")
        
    db.delete(leave)
    db.commit()
