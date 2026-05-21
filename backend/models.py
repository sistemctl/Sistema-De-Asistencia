"""
Modelos ORM de SQLAlchemy.
Tablas: users, departments, employees, attendance_records, device_config, sync_logs
"""
from datetime import datetime
from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey,
    Integer, String, Text, UniqueConstraint
)
from sqlalchemy.orm import relationship

from backend.database import Base


class User(Base):
    """Usuarios del sistema web (administradores / visualizadores)."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    role = Column(String(20), default="viewer")          # admin | viewer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)
    last_login = Column(DateTime, nullable=True)


class Department(Base):
    """Departamentos / áreas de la empresa."""
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    employees = relationship("Employee", back_populates="department")


class Position(Base):
    """Cargos / puestos de la empresa."""
    __tablename__ = "positions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.now)

    employees = relationship("Employee", back_populates="position")


class Schedule(Base):
    """Horarios / turnos de trabajo asignables a empleados."""
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    shift_type = Column(String(30), default="continuous", nullable=False)  # continuous / split
    work_start_time = Column(String(5), default="07:00")  # HH:MM
    work_end_time = Column(String(5), default="18:00")     # HH:MM
    lunch_start_time = Column(String(5), nullable=True)   # HH:MM
    lunch_end_time = Column(String(5), nullable=True)     # HH:MM
    created_at = Column(DateTime, default=datetime.now)

    employees = relationship("Employee", back_populates="schedule")


class Employee(Base):
    """Empleados registrados en el sistema."""
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    employee_code = Column(String(50), unique=True, nullable=False, index=True)  # Código empresa
    device_user_id = Column(String(50), nullable=True)   # ID en el dispositivo Hikvision
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(150), nullable=True)
    phone = Column(String(30), nullable=True)
    position_legacy = Column(String(100), nullable=True)
    position_id = Column(Integer, ForeignKey("positions.id"), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    schedule_id = Column(Integer, ForeignKey("schedules.id"), nullable=True)
    photo_path = Column(String(500), nullable=True)       # Ruta relativa a uploads/faces/
    card_number = Column(String(50), nullable=True)       # Número de tarjeta M1
    is_active = Column(Boolean, default=True)
    synced_to_device = Column(Boolean, default=False)     # ¿Está registrado en el dispositivo?
    work_start_time = Column(String(5), default="07:00")  # HH:MM
    work_end_time = Column(String(5), default="18:00")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    department = relationship("Department", back_populates="employees")
    position = relationship("Position", back_populates="employees")
    schedule = relationship("Schedule", back_populates="employees")
    attendance_records = relationship("AttendanceRecord", back_populates="employee")

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class AttendanceRecord(Base):
    """Registros de asistencia obtenidos del dispositivo."""
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    device_event_id = Column(String(100), nullable=True)       # ID del evento en el dispositivo
    device_user_id = Column(String(50), nullable=True)         # ID del usuario en el dispositivo
    event_time = Column(DateTime, nullable=False, index=True)
    event_type = Column(String(30), default="entry")           # entry | exit | unknown
    auth_method = Column(String(30), nullable=True)            # face | card | face+card
    temperature = Column(Float, nullable=True)                  # Si el dispositivo lo provee
    mask_detected = Column(Boolean, nullable=True)
    is_late = Column(Boolean, default=False)
    raw_data = Column(Text, nullable=True)                      # JSON crudo del evento
    created_at = Column(DateTime, default=datetime.now)

    employee = relationship("Employee", back_populates="attendance_records")

    __table_args__ = (
        UniqueConstraint("device_event_id", name="uq_device_event_id"),
    )


class DeviceConfig(Base):
    """Configuración del dispositivo Hikvision (editable desde la UI)."""
    __tablename__ = "device_config"

    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String(50), default="192.168.4.137")
    port = Column(Integer, default=80)
    username = Column(String(100), default="admin")
    password = Column(String(255), default="admin123")
    sync_interval_minutes = Column(Integer, default=5)
    is_online = Column(Boolean, default=False)
    last_check = Column(DateTime, nullable=True)
    last_successful_sync = Column(DateTime, nullable=True)
    total_events_synced = Column(Integer, default=0)
    entry_tolerance_minutes = Column(Integer, default=10)
    exit_tolerance_minutes = Column(Integer, default=10)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class SyncLog(Base):
    """Historial de sincronizaciones con el dispositivo."""
    __tablename__ = "sync_logs"

    id = Column(Integer, primary_key=True, index=True)
    started_at = Column(DateTime, default=datetime.now)
    finished_at = Column(DateTime, nullable=True)
    status = Column(String(20), default="running")   # running | success | error | offline
    events_fetched = Column(Integer, default=0)
    events_new = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    is_mock = Column(Boolean, default=False)          # True si fue sincronización simulada
