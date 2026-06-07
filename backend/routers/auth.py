"""Router de autenticación: login, logout, perfil."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.auth import authenticate_user, create_access_token, get_current_user, get_password_hash, require_admin, check_permission
from backend.database import get_db
from backend.models import User
from backend.schemas import LoginRequest, Token, UserCreate, UserOut, UserUpdate

from backend.utils import get_local_now

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, data.username, data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales incorrectas")
    user.last_login = get_local_now().replace(tzinfo=None)
    db.commit()
    token = create_access_token({"sub": user.username})
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(check_permission("perm_manage_users"))):
    return db.query(User).all()


@router.post("/users", response_model=UserOut, status_code=201)
def create_user(data: UserCreate, db: Session = Depends(get_db), _: User = Depends(check_permission("perm_manage_users"))):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="El usuario ya existe")
    user = User(
        username=data.username,
        hashed_password=get_password_hash(data.password),
        full_name=data.full_name,
        role=data.role,
        perm_manage_users=data.perm_manage_users,
        perm_manage_device=data.perm_manage_device,
        perm_manage_settings=data.perm_manage_settings,
        perm_manage_employees=data.perm_manage_employees,
        perm_manage_schedules=data.perm_manage_schedules,
        perm_export_reports=data.perm_export_reports,
        perm_manage_attendance=data.perm_manage_attendance,
        perm_sync_device=data.perm_sync_device,
        perm_view_employees=data.perm_view_employees,
        force_password_change=data.force_password_change,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/users/{user_id}", response_model=UserOut)
def update_user(user_id: int, data: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    is_admin = current_user.role == 'admin' or current_user.perm_manage_users
    
    if user_id != current_user.id and not is_admin:
        raise HTTPException(status_code=403, detail="No tienes permisos para editar este usuario")

    if data.full_name is not None:
        user.full_name = data.full_name
    if data.password is not None:
        user.hashed_password = get_password_hash(data.password)
        
    if is_admin:
        if data.role is not None:
            user.role = data.role
        if data.is_active is not None:
            user.is_active = data.is_active
        
        if data.perm_manage_users is not None:
            user.perm_manage_users = data.perm_manage_users
        if data.perm_manage_device is not None:
            user.perm_manage_device = data.perm_manage_device
        if data.perm_manage_settings is not None:
            user.perm_manage_settings = data.perm_manage_settings
        if data.perm_manage_employees is not None:
            user.perm_manage_employees = data.perm_manage_employees
        if data.perm_manage_schedules is not None:
            user.perm_manage_schedules = data.perm_manage_schedules
        if data.perm_export_reports is not None:
            user.perm_export_reports = data.perm_export_reports
        if data.perm_manage_attendance is not None:
            user.perm_manage_attendance = data.perm_manage_attendance
        if data.perm_sync_device is not None:
            user.perm_sync_device = data.perm_sync_device
        if data.perm_view_employees is not None:
            user.perm_view_employees = data.perm_view_employees
            
    if data.force_password_change is not None:
        if is_admin or (user_id == current_user.id and data.force_password_change is False):
            user.force_password_change = data.force_password_change

    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("perm_manage_users"))
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    db.delete(user)
    db.commit()

