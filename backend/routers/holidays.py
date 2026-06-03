from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import holidays

from backend.database import get_db
from backend.auth import get_current_user, check_permission
from backend.models import Holiday, User
from backend.schemas import HolidayOut, HolidayCreate, HolidayUpdate

router = APIRouter(prefix="/api/holidays", tags=["holidays"])

@router.get("", response_model=List[HolidayOut])
def list_holidays(
    year: int = Query(..., description="Año a consultar"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    """
    Lista todos los festivos para un año específico.
    Si no existen festivos en la BD para ese año, se autogeneran los de Colombia.
    """
    start_date = date(year, 1, 1)
    end_date = date(year, 12, 31)
    
    # Query database
    db_holidays = db.query(Holiday).filter(
        Holiday.date >= start_date,
        Holiday.date <= end_date
    ).order_by(Holiday.date).all()
    
    if not db_holidays:
        # Generate automatically using holidays library for Colombia
        co_holidays = holidays.Colombia(years=[year])
        if co_holidays:
            print(f"Generando automáticamente {len(co_holidays)} festivos de Colombia para el año {year}...")
            new_holidays = []
            for h_date, name in sorted(co_holidays.items()):
                # Guardar en base de datos
                h = Holiday(date=h_date, name=name, is_active=True, is_custom=False)
                db.add(h)
                new_holidays.append(h)
            db.commit()
            for h in new_holidays:
                db.refresh(h)
            db_holidays = sorted(new_holidays, key=lambda x: x.date)
            
    return db_holidays

@router.post("", response_model=HolidayOut, status_code=201)
def create_holiday(
    data: HolidayCreate,
    db: Session = Depends(get_db),
    _=Depends(check_permission("perm_manage_settings"))
):
    """Crea un festivo personalizado manualmente."""
    # Check if holiday exists on that date
    exists = db.query(Holiday).filter(Holiday.date == data.date).first()
    if exists:
        raise HTTPException(status_code=400, detail="Ya existe un día festivo registrado en esta fecha.")
        
    h = Holiday(
        date=data.date,
        name=data.name,
        is_active=data.is_active,
        is_custom=True
    )
    db.add(h)
    db.commit()
    db.refresh(h)
    return h

@router.put("/{holiday_id}", response_model=HolidayOut)
def update_holiday(
    holiday_id: int,
    data: HolidayUpdate,
    db: Session = Depends(get_db),
    _=Depends(check_permission("perm_manage_settings"))
):
    """Modifica o activa/desactiva un festivo."""
    h = db.query(Holiday).filter(Holiday.id == holiday_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Día festivo no encontrado.")
        
    if data.name is not None:
        h.name = data.name
    if data.is_active is not None:
        h.is_active = data.is_active
        
    db.commit()
    db.refresh(h)
    return h

@router.delete("/{holiday_id}", status_code=204)
def delete_holiday(
    holiday_id: int,
    db: Session = Depends(get_db),
    _=Depends(check_permission("perm_manage_settings"))
):
    """Elimina un festivo personalizado."""
    h = db.query(Holiday).filter(Holiday.id == holiday_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Día festivo no encontrado.")
        
    if not h.is_custom:
        raise HTTPException(status_code=400, detail="No se pueden eliminar los festivos oficiales nacionales; solo desactivarlos.")
        
    db.delete(h)
    db.commit()
