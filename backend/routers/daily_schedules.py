from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.auth import get_current_user, check_permission, check_permission_or
require_manage_schedules = check_permission("perm_manage_schedules")
require_view_schedules = check_permission_or("perm_manage_schedules", "perm_view_employees")

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
    _=Depends(require_view_schedules)
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
    _=Depends(require_manage_schedules)
):
    """Genera horarios cíclicos rotativos en lote para uno o más empleados."""
    if data.sequence:
        total_length = sum(step.days for step in data.sequence)
        if total_length <= 0:
            raise HTTPException(status_code=400, detail="La longitud total del ciclo debe ser mayor a 0")
        
        # Verify schedule IDs in the sequence
        for step in data.sequence:
            if not step.is_off and step.schedule_id:
                sched = db.query(Schedule).filter(Schedule.id == step.schedule_id).first()
                if not sched:
                    raise HTTPException(status_code=404, detail=f"Horario {step.schedule_id} no encontrado")
    else:
        total_length = (data.cycle_days_work or 0) + (data.cycle_nights_work or 0) + (data.cycle_days_off or 0)
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

            if data.sequence:
                acc_days = 0
                sched_id = None
                is_off = True
                for step in data.sequence:
                    if cycle_idx < (acc_days + step.days):
                        sched_id = step.schedule_id if not step.is_off else None
                        is_off = step.is_off
                        break
                    acc_days += step.days
            else:
                if cycle_idx < data.cycle_days_work:
                    sched_id = data.day_schedule_id
                    is_off = False
                elif cycle_idx < (data.cycle_days_work + data.cycle_nights_work):
                    sched_id = data.night_schedule_id
                    is_off = False
                else:
                    sched_id = None
                    is_off = True

            if sched_id is None and not is_off:
                # Do not write any daily schedule override record, leaving it unmarked
                continue

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
    _=Depends(require_manage_schedules)
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
