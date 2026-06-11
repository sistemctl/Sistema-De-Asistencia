"""Router de horarios (schedules): CRUD de turnos."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.auth import get_current_user, check_permission, check_permission_or
require_manage_schedules = check_permission("perm_manage_schedules")
require_view_schedules = check_permission_or("perm_manage_schedules", "perm_view_employees")

from backend.database import get_db
from backend.models import Schedule, Employee
from backend.schemas import ScheduleCreate, ScheduleOut, ScheduleUpdate

router = APIRouter(prefix="/api/schedules", tags=["schedules"])


@router.get("", response_model=list[ScheduleOut])
def list_schedules(db: Session = Depends(get_db), _=Depends(require_view_schedules)):
    """Lista todos los horarios disponibles en el sistema."""
    return db.query(Schedule).order_by(Schedule.name).all()


@router.get("/{schedule_id}", response_model=ScheduleOut)
def get_schedule(schedule_id: int, db: Session = Depends(get_db), _=Depends(require_view_schedules)):
    """Obtiene los detalles de un horario específico."""
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Horario no encontrado")
    return schedule


@router.post("", response_model=ScheduleOut, status_code=201)
def create_schedule(data: ScheduleCreate, db: Session = Depends(get_db), _=Depends(require_manage_schedules)):
    """Crea un nuevo horario (solo administrador)."""
    # Verificar si ya existe un horario con el mismo nombre
    if db.query(Schedule).filter(Schedule.name == data.name).first():
        raise HTTPException(status_code=400, detail="Ya existe un horario con ese nombre")
    
    schedule = Schedule(**data.model_dump())
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule


@router.put("/{schedule_id}", response_model=ScheduleOut)
def update_schedule(schedule_id: int, data: ScheduleUpdate, db: Session = Depends(get_db), _=Depends(require_manage_schedules)):
    """Actualiza un horario existente (solo administrador)."""
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Horario no encontrado")
    
    # Si cambia el nombre, verificar que no esté duplicado
    if data.name and data.name != schedule.name:
        if db.query(Schedule).filter(Schedule.name == data.name).first():
            raise HTTPException(status_code=400, detail="Ya existe un horario con ese nombre")
            
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(schedule, field, value)
        
    db.commit()
    db.refresh(schedule)
    return schedule


@router.delete("/{schedule_id}", status_code=204)
def delete_schedule(schedule_id: int, db: Session = Depends(get_db), _=Depends(require_manage_schedules)):
    """Elimina un horario (solo administrador)."""
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Horario no encontrado")

    from datetime import date
    from backend.models import Employee, EmployeeDailySchedule

    # 1. Validar uso en perfil de empleados
    using_employees = db.query(Employee).filter(Employee.schedule_id == schedule_id).all()
    if using_employees:
        names = [emp.full_name for emp in using_employees[:5]]
        names_str = ", ".join(names)
        if len(using_employees) > 5:
            names_str += f" y {len(using_employees) - 5} más"
        raise HTTPException(
            status_code=400,
            detail=f"No se puede eliminar el horario porque está asignado como horario base a: {names_str}. "
                   f"Reasigne o deje sin horario a estos empleados antes de eliminarlo."
        )

    # 2. Validar uso en la planificación futura del calendario semanal
    today = date.today()
    using_dailies = db.query(EmployeeDailySchedule).filter(
        EmployeeDailySchedule.schedule_id == schedule_id,
        EmployeeDailySchedule.date >= today
    ).all()
    if using_dailies:
        emp_ids = list(set([d.employee_id for d in using_dailies]))
        using_emp_names = db.query(Employee).filter(Employee.id.in_(emp_ids)).all()
        names = [emp.full_name for emp in using_emp_names[:5]]
        names_str = ", ".join(names)
        if len(using_emp_names) > 5:
            names_str += f" y {len(using_emp_names) - 5} más"
        raise HTTPException(
            status_code=400,
            detail=f"No se puede eliminar el horario porque está planificado en el calendario de: {names_str}. "
                   f"Limpie o cambie los turnos de estos empleados en el Calendario Semanal antes de eliminarlo."
        )
        
    db.delete(schedule)
    db.commit()
