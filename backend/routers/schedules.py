"""Router de horarios (schedules): CRUD de turnos."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.auth import get_current_user, require_admin
from backend.database import get_db
from backend.models import Schedule, Employee
from backend.schemas import ScheduleCreate, ScheduleOut, ScheduleUpdate

router = APIRouter(prefix="/api/schedules", tags=["schedules"])


@router.get("", response_model=list[ScheduleOut])
def list_schedules(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Lista todos los horarios disponibles en el sistema."""
    return db.query(Schedule).order_by(Schedule.name).all()


@router.get("/{schedule_id}", response_model=ScheduleOut)
def get_schedule(schedule_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Obtiene los detalles de un horario específico."""
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Horario no encontrado")
    return schedule


@router.post("", response_model=ScheduleOut, status_code=201)
def create_schedule(data: ScheduleCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
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
def update_schedule(schedule_id: int, data: ScheduleUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
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
def delete_schedule(schedule_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    """Elimina un horario (solo administrador)."""
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Horario no encontrado")
        
    db.delete(schedule)
    db.commit()
