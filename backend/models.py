"""
Modelos ORM de SQLAlchemy.
Tablas: users, departments, employees, attendance_records, device_config, sync_logs
"""
from datetime import datetime
from sqlalchemy import (
    Boolean, Column, Date, DateTime, Float, ForeignKey,
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
    force_password_change = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)
    last_login = Column(DateTime, nullable=True)

    # Granular Permissions
    perm_manage_users = Column(Boolean, default=False)
    perm_manage_device = Column(Boolean, default=False)
    perm_manage_settings = Column(Boolean, default=False)
    perm_manage_employees = Column(Boolean, default=False)
    perm_manage_schedules = Column(Boolean, default=False)
    perm_export_reports = Column(Boolean, default=False)
    perm_manage_attendance = Column(Boolean, default=False)
    perm_sync_device = Column(Boolean, default=False)
    perm_view_employees = Column(Boolean, default=False)



class Department(Base):
    """Departamentos / áreas de la empresa."""
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    employees = relationship("Employee", back_populates="department")


class Position(Base):
    """Cargos / puestos de la empresa."""
    __tablename__ = "positions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

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
    work_days = Column(String(100), default="1,2,3,4,5", nullable=False) # Lunes a Viernes (1=Lunes, 7=Domingo)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

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
    position_id = Column(Integer, ForeignKey("positions.id"), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    schedule_id = Column(Integer, ForeignKey("schedules.id"), nullable=True)
    photo_path = Column(String(500), nullable=True)       # Ruta relativa a uploads/faces/
    card_number = Column(String(50), nullable=True)       # Número de tarjeta M1 o código QR virtual
    qr_enabled = Column(Boolean, default=False)           # Si tiene habilitado el acceso por QR
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
    automatic_sync_enabled = Column(Boolean, default=True)
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


class SystemConfig(Base):
    """Configuración de personalización y parámetros generales del software."""
    __tablename__ = "system_config"

    id = Column(Integer, primary_key=True, index=True)
    system_name = Column(String(100), default="Control de Asistencia")
    company_name = Column(String(100), default="Hikvision DS-K1T323MBWX")
    logo_path = Column(String(500), nullable=True)
    primary_color = Column(String(30), default="#1e3a5f")
    accent_color = Column(String(30), default="#00e676")
    
    # Datos de retención y limpieza (Mantenimiento)
    cleanup_enabled = Column(Boolean, default=False)
    cleanup_time = Column(String(10), default="02:00")
    
    # Configuración de backups automáticos
    backup_dir = Column(String(255), default="backups", nullable=True)
    backup_retention_days = Column(Integer, default=7, nullable=True)
    
    # Tiempos de programación de tareas en segundo plano
    daily_report_time = Column(String(10), default="19:00")
    absences_check_time = Column(String(10), default="11:00")
    
    retention_attendance_days = Column(Integer, default=1825)
    retention_audit_logs_days = Column(Integer, default=365)
    retention_sync_logs_days = Column(Integer, default=30)
    
    cleanup_attendance_enabled = Column(Boolean, default=True)
    cleanup_audit_enabled = Column(Boolean, default=True)
    cleanup_sync_enabled = Column(Boolean, default=True)
    
    bg_base_color = Column(String(30), default="#f8fafc")
    bg_surface_color = Column(String(30), default="#ffffff")
    work_days = Column(String(100), default="1,2,3,4,5") # Lunes a Viernes (1=Lunes, 7=Domingo)
    time_format = Column(String(10), default="24h") # 12h / 24h
    
    # ── QR Settings ──
    qr_badge_show_blood_type = Column(Boolean, default=True)
    qr_badge_show_department = Column(Boolean, default=True)
    mobile_qr_portal_enabled = Column(Boolean, default=False)
    
    tolerance_enable = Column(Boolean, default=True)
    entry_tolerance_minutes = Column(Integer, default=10)
    exit_tolerance_minutes = Column(Integer, default=10)
    require_checkin = Column(Boolean, default=True)
    require_checkout = Column(Boolean, default=True)
    
    # Turno normal tardanzas/ausencias
    mark_late_enable = Column(Boolean, default=True)
    mark_late_limit_minutes = Column(Integer, default=0)
    
    mark_absent_if_late_enable = Column(Boolean, default=False)
    mark_absent_if_late_limit_minutes = Column(Integer, default=60)
    
    mark_early_departure_enable = Column(Boolean, default=True)
    mark_early_departure_limit_minutes = Column(Integer, default=0)
    
    mark_absent_if_early_checkout_enable = Column(Boolean, default=False)
    mark_absent_if_early_checkout_limit_minutes = Column(Integer, default=60)
    
    # Sin registros
    no_checkin_enable = Column(Boolean, default=True)
    no_checkin_status = Column(String(20), default="Absent")
    no_checkout_enable = Column(Boolean, default=True)
    no_checkout_status = Column(String(20), default="Absent")
    
    # Turno flexible rango de horas
    flexible_shift_enable = Column(Boolean, default=True)
    flexible_shift_start = Column(String(10), default="09:00:00")
    flexible_shift_end = Column(String(10), default="18:00:00")
    
    # Configuración de Correo SMTP y Alertas
    smtp_host = Column(String(100), default="smtp.gmail.com", nullable=True)
    smtp_port = Column(Integer, default=587, nullable=True)
    smtp_username = Column(String(150), nullable=True)
    smtp_password = Column(String(255), nullable=True)
    smtp_use_tls = Column(Boolean, default=True)
    email_notifications_enabled = Column(Boolean, default=False)
    email_alerts_recipients = Column(String(500), nullable=True)
    
    # Notificaciones Específicas
    alert_device_offline = Column(Boolean, default=True)
    alert_employee_lateness = Column(Boolean, default=True)
    alert_admin_daily_report = Column(Boolean, default=True)

    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class EmployeeDailySchedule(Base):
    """Asignación de turnos y descansos diarios para empleados (turnos rotativos)."""
    __tablename__ = "employee_daily_schedules"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    schedule_id = Column(Integer, ForeignKey("schedules.id", ondelete="SET NULL"), nullable=True)
    is_off = Column(Boolean, default=False, nullable=False) # Si es verdadero, indica descanso obligatorio

    employee = relationship("Employee")
    schedule = relationship("Schedule")

    __table_args__ = (
        UniqueConstraint("employee_id", "date", name="uq_emp_date"),
    )


class Holiday(Base):
    """Días festivos nacionales y personalizados de la empresa."""
    __tablename__ = "holidays"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False)
    is_active = Column(Boolean, default=True)  # True = es festivo/descanso, False = la empresa labora con normalidad
    is_custom = Column(Boolean, default=False) # True = agregado manualmente por el administrador
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class EmployeeLeave(Base):
    """Registro de novedades: vacaciones, incapacidades, licencias, etc."""
    __tablename__ = "employee_leaves"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    leave_type = Column(String(50), nullable=False)  # 'vacation', 'medical', 'paid_leave', 'unpaid_leave', 'suspension'
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False, index=True)
    description = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    employee = relationship("Employee")


class AttendanceJustification(Base):
    """Justificaciones individuales de faltas o retardos por día y empleado."""
    __tablename__ = "attendance_justifications"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    justification_type = Column(String(50), nullable=False)  # 'absence', 'lateness', 'other'
    reason = Column(String(500), nullable=False)
    override_status = Column(String(50), nullable=False)      # 'present', 'on_time'
    document_path = Column(String(500), nullable=True)        # Ruta relativa a uploads/justifications/
    created_at = Column(DateTime, default=datetime.now)

    employee = relationship("Employee")

    __table_args__ = (
        UniqueConstraint("employee_id", "date", name="uq_emp_justification_date"),
    )


class AuditLog(Base):
    """Registro de acciones administrativas (Audit Logs) para trazabilidad de seguridad."""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)      # e.g., 'CREATE_EMPLOYEE', 'UPDATE_SETTINGS'
    entity = Column(String(100), nullable=False, index=True)      # e.g., 'Employee', 'SystemConfig'
    entity_id = Column(String(100), nullable=True)                # El ID del registro afectado (string por si no es numérico)
    details = Column(Text, nullable=True)                         # Información en JSON crudo de lo que cambió
    ip_address = Column(String(50), nullable=True)                # IP desde donde se realizó el cambio
    created_at = Column(DateTime, default=datetime.now, index=True)

    user = relationship("User")



