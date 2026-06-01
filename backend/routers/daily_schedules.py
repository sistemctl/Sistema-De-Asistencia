from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.auth import get_current_user, require_admin
from backend.database import get_db
from backend.models import EmployeeDailySchedule, Schedule, Employee
from backend.schemas import DailyScheduleOut, DailyScheduleGenerateInput, DailyScheduleAssignInput

router = APIRouter(prefix="/api/employees/daily-schedules", tags=["daily-schedules"])


@router.get("", response_model=List[DailyScheduleOut])
def get_daily_schedules(
    start_date: date,
    end_date: date,
    employee_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    """Obtiene los horarios diarios para un rango de fechas."""
    query = db.query(EmployeeDailySchedule).filter(
        EmployeeDailySchedule.date >= start_date,
        EmployeeDailySchedule.date <= end_date
    )
    if employee_id:
        query = query.filter(EmployeeDailySchedule.employee_id == employee_id)
    return query.order_by(EmployeeDailySchedule.date).all()


@router.post("/generate", status_code=201)
def generate_daily_schedules(
    data: DailyScheduleGenerateInput,
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    """Genera horarios cíclicos rotativos en lote para uno o más empleados."""
    total_length = data.cycle_days_work + data.cycle_nights_work + data.cycle_days_off
    if total_length <= 0:
        raise HTTPException(status_code=400, detail="La longitud total del ciclo debe ser mayor a 0")

    # Verificar existencia de horarios
    if data.day_schedule_id:
        day_sched = db.query(Schedule).filter(Schedule.id == data.day_schedule_id).first()
        if not day_sched:
            raise HTTPException(status_code=404, detail=f"Horario de día {data.day_schedule_id} no encontrado")

    if data.night_schedule_id:
        night_sched = db.query(Schedule).filter(Schedule.id == data.night_schedule_id).first()
        if not night_sched:
            raise HTTPException(status_code=404, detail=f"Horario de noche {data.night_schedule_id} no encontrado")

    # Generar rango de fechas
    date_list = []
    curr = data.start_date
    while curr <= data.end_date:
        date_list.append(curr)
        curr += timedelta(days=1)

    generated_count = 0

    for emp_id in data.employee_ids:
        # Verificar empleado
        emp = db.query(Employee).filter(Employee.id == emp_id).first()
        if not emp:
            continue

        # Eliminar cualquier horario diario existente en este rango de fechas para evitar duplicados/conflictos
        db.query(EmployeeDailySchedule).filter(
            EmployeeDailySchedule.employee_id == emp_id,
            EmployeeDailySchedule.date >= data.start_date,
            EmployeeDailySchedule.date <= data.end_date
        ).delete(synchronize_session=False)

        # Generar registros
        for day_idx, current_date in enumerate(date_list):
            cycle_idx = day_idx % total_length

            if cycle_idx < data.cycle_days_work:
                sched_id = data.day_schedule_id
                is_off = False
            elif cycle_idx < (data.cycle_days_work + data.cycle_nights_work):
                sched_id = data.night_schedule_id
                is_off = False
            else:
                sched_id = None
                is_off = True

            daily_sched = EmployeeDailySchedule(
                employee_id=emp_id,
                date=current_date,
                schedule_id=sched_id,
                is_off=is_off
            )
            db.add(daily_sched)
            generated_count += 1

    db.commit()
    return {"message": "Horarios generados con éxito", "total_records": generated_count}


@router.post("/assign", response_model=DailyScheduleOut)
def assign_daily_schedule(
    data: DailyScheduleAssignInput,
    db: Session = Depends(get_db),
    _=Depends(require_admin)
):
    """Asigna manualmente un horario para un día específico (excepción/modificación individual)."""
    # Buscar si ya existe
    daily = db.query(EmployeeDailySchedule).filter(
        EmployeeDailySchedule.employee_id == data.employee_id,
        EmployeeDailySchedule.date == data.date
    ).first()

    # Si no tiene schedule_id y no es libre (is_off=False), simplemente eliminamos el registro diario 
    # para que herede el horario por defecto.
    if data.schedule_id is None and not data.is_off:
        if daily:
            db.delete(daily)
            db.commit()
        return DailyScheduleOut(
            id=0,
            employee_id=data.employee_id,
            date=data.date,
            schedule_id=None,
            is_off=False
        )

    if not daily:
        daily = EmployeeDailySchedule(
            employee_id=data.employee_id,
            date=data.date
        )
        db.add(daily)

    daily.schedule_id = data.schedule_id
    daily.is_off = data.is_off
    db.commit()
    db.refresh(daily)
    return daily
