"""
Pydantic schemas para validación de requests y serialización de responses.
"""
from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, EmailStr, field_validator, model_validator


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"

class UserOut(BaseModel):
    id: int
    username: str
    full_name: str
    role: str
    is_active: bool
    force_password_change: bool = False
    perm_manage_users: bool = False
    perm_manage_device: bool = False
    perm_manage_settings: bool = False
    perm_manage_employees: bool = False
    perm_manage_schedules: bool = False
    perm_export_reports: bool = False
    perm_manage_attendance: bool = False
    perm_sync_device: bool = False
    perm_view_employees: bool = False

    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    role: str = "viewer"
    force_password_change: bool = False
    perm_manage_users: bool = False
    perm_manage_device: bool = False
    perm_manage_settings: bool = False
    perm_manage_employees: bool = False
    perm_manage_schedules: bool = False
    perm_export_reports: bool = False
    perm_manage_attendance: bool = False
    perm_sync_device: bool = False
    perm_view_employees: bool = False

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    force_password_change: Optional[bool] = None
    perm_manage_users: Optional[bool] = None
    perm_manage_device: Optional[bool] = None
    perm_manage_settings: Optional[bool] = None
    perm_manage_employees: Optional[bool] = None
    perm_manage_schedules: Optional[bool] = None
    perm_export_reports: Optional[bool] = None
    perm_manage_attendance: Optional[bool] = None
    perm_sync_device: Optional[bool] = None
    perm_view_employees: Optional[bool] = None




# ── Departments ───────────────────────────────────────────────────────────────

class DepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = None

class DepartmentOut(DepartmentCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Positions ─────────────────────────────────────────────────────────────────

class PositionCreate(BaseModel):
    name: str
    description: Optional[str] = None

class PositionOut(PositionCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Schedules ─────────────────────────────────────────────────────────────────

class ScheduleCreate(BaseModel):
    name: str
    shift_type: str = "continuous"  # continuous / split / flexible
    work_start_time: str = "07:00"
    work_end_time: str = "18:00"
    lunch_start_time: Optional[str] = None
    lunch_end_time: Optional[str] = None
    work_days: str = "1,2,3,4,5"

class ScheduleUpdate(BaseModel):
    name: Optional[str] = None
    shift_type: Optional[str] = None
    work_start_time: Optional[str] = None
    work_end_time: Optional[str] = None
    lunch_start_time: Optional[str] = None
    lunch_end_time: Optional[str] = None
    work_days: Optional[str] = None

class ReportPunches(BaseModel):
    entry_1: Optional[datetime] = None
    exit_1: Optional[datetime] = None
    entry_2: Optional[datetime] = None
    exit_2: Optional[datetime] = None

class ReportAuthMethods(BaseModel):
    entry_1: Optional[str] = None
    exit_1: Optional[str] = None
    entry_2: Optional[str] = None
    exit_2: Optional[str] = None

class ReportItem(BaseModel):
    employee_id: int
    employee_name: str
    employee_code: str
    department: str
    date: date
    schedule_type: str
    punches: ReportPunches
    auth_methods: Optional[ReportAuthMethods] = None
    total_raw_events: int
    is_present: bool
    is_late: bool
    missing_punches: bool
    period_start: Optional[date] = None  # for weekly/monthly grouping
    period_end: Optional[date] = None

class ReportResponse(BaseModel):
    total: int
    page: int
    page_size: int
    pages: int
    items: List[ReportItem]
    shift_type: Optional[str] = None
    work_start_time: Optional[str] = None
    work_end_time: Optional[str] = None
    lunch_start_time: Optional[str] = None
    lunch_end_time: Optional[str] = None

class ScheduleOut(BaseModel):
    id: int
    name: str
    shift_type: str
    work_start_time: str
    work_end_time: str
    lunch_start_time: Optional[str] = None
    lunch_end_time: Optional[str] = None
    work_days: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Daily Schedules ───────────────────────────────────────────────────────────

class DailyScheduleOut(BaseModel):
    id: int
    employee_id: int
    date: date
    schedule_id: Optional[int] = None
    is_off: bool
    schedule: Optional[ScheduleOut] = None

    class Config:
        from_attributes = True


class CycleStepInput(BaseModel):
    days: int
    schedule_id: Optional[int] = None
    is_off: bool = False


class DailyScheduleGenerateInput(BaseModel):
    employee_ids: List[int]
    start_date: date
    end_date: date
    cycle_days_work: Optional[int] = 0
    cycle_nights_work: Optional[int] = 0
    cycle_days_off: Optional[int] = 0
    day_schedule_id: Optional[int] = None
    night_schedule_id: Optional[int] = None
    sequence: Optional[List[CycleStepInput]] = None


class DailyScheduleAssignInput(BaseModel):
    employee_id: int
    date: date
    schedule_id: Optional[int] = None
    is_off: bool = False


# ── Employees ─────────────────────────────────────────────────────────────────

class EmployeeCreate(BaseModel):
    employee_code: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    position_id: Optional[int] = None
    department_id: Optional[int] = None
    schedule_id: Optional[int] = None
    card_number: Optional[str] = None
    qr_enabled: bool = False
    work_start_time: str = "07:00"
    work_end_time: str = "18:00"

    @field_validator('employee_code')
    @classmethod
    def validate_employee_code(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError("El código de empleado debe contener únicamente números (dígitos del 0 al 9)")
        return v

class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    position_id: Optional[int] = None
    department_id: Optional[int] = None
    schedule_id: Optional[int] = None
    card_number: Optional[str] = None
    qr_enabled: Optional[bool] = None
    work_start_time: Optional[str] = None
    work_end_time: Optional[str] = None
    is_active: Optional[bool] = None

class EmployeeOut(BaseModel):
    id: int
    employee_code: str
    device_user_id: Optional[str]
    first_name: str
    last_name: str
    full_name: str
    email: Optional[str]
    phone: Optional[str]
    position_id: Optional[int]
    position: Optional[PositionOut]
    department_id: Optional[int]
    department: Optional[DepartmentOut]
    schedule_id: Optional[int]
    schedule: Optional[ScheduleOut]
    photo_path: Optional[str]
    card_number: Optional[str]
    qr_enabled: bool
    is_active: bool
    synced_to_device: bool
    work_start_time: str
    work_end_time: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Attendance ────────────────────────────────────────────────────────────────

class AttendanceOut(BaseModel):
    id: int
    employee_id: Optional[int]
    employee: Optional[EmployeeOut]
    device_event_id: Optional[str]
    event_time: datetime
    event_type: str
    auth_method: Optional[str]
    temperature: Optional[float]
    is_late: bool
    created_at: datetime

    class Config:
        from_attributes = True

class AttendanceFilter(BaseModel):
    employee_id: Optional[int] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    event_type: Optional[str] = None
    page: int = 1
    page_size: int = 50


# ── Device Config ─────────────────────────────────────────────────────────────

class DeviceConfigUpdate(BaseModel):
    ip_address: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None
    sync_interval_minutes: Optional[int] = None
    automatic_sync_enabled: Optional[bool] = None
    entry_tolerance_minutes: Optional[int] = None
    exit_tolerance_minutes: Optional[int] = None

class DeviceConfigOut(BaseModel):
    id: int
    ip_address: str
    port: int
    username: str
    sync_interval_minutes: int
    automatic_sync_enabled: bool
    is_online: bool
    last_check: Optional[datetime]
    last_successful_sync: Optional[datetime]
    total_events_synced: int
    entry_tolerance_minutes: int
    exit_tolerance_minutes: int

    class Config:
        from_attributes = True

class DeviceStatusOut(BaseModel):
    is_online: bool
    ip_address: str
    last_check: Optional[datetime]
    last_successful_sync: Optional[datetime]
    total_events_synced: int
    is_mock_mode: bool
    device_info: Optional[dict] = None


# ── Sync Log ──────────────────────────────────────────────────────────────────

class SyncLogOut(BaseModel):
    id: int
    started_at: datetime
    finished_at: Optional[datetime]
    status: str
    events_fetched: int
    events_new: int
    error_message: Optional[str]
    is_mock: bool

    class Config:
        from_attributes = True


# ── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardKPIs(BaseModel):
    today_present: int
    today_absent: int
    today_late: int
    today_leaves: int
    total_employees: int
    attendance_rate: float
    last_sync: Optional[datetime]
    device_online: bool

class WeeklyData(BaseModel):
    labels: list[str]
    present: list[int]
    absent: list[int]
    late: list[int]

class RecentEvent(BaseModel):
    employee_name: str
    event_time: datetime
    event_type: str
    auth_method: Optional[str]
    photo_path: Optional[str]


# ── Holidays ──────────────────────────────────────────────────────────────────

class HolidayOut(BaseModel):
    id: int
    date: date
    name: str
    is_active: bool
    is_custom: bool

    class Config:
        from_attributes = True

class HolidayCreate(BaseModel):
    date: date
    name: str
    is_active: bool = True

class HolidayUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None


# ── Employee Leaves (Novedades) ───────────────────────────────────────────────

class LeaveOut(BaseModel):
    id: int
    employee_id: int
    leave_type: str
    start_date: date
    end_date: date
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    employee: Optional[EmployeeOut] = None

    class Config:
        from_attributes = True

class LeaveCreate(BaseModel):
    employee_id: int
    leave_type: str
    start_date: date
    end_date: date
    description: Optional[str] = None

    @model_validator(mode='after')
    def validate_dates(self):
        if self.end_date < self.start_date:
            raise ValueError("La fecha de fin no puede ser anterior a la fecha de inicio")
        return self

class LeaveUpdate(BaseModel):
    leave_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    description: Optional[str] = None

    @model_validator(mode='after')
    def validate_dates(self):
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("La fecha de fin no puede ser anterior a la fecha de inicio")
        return self


# ── Attendance Justification (Justificaciones) ────────────────────────────────

class AttendanceJustificationOut(BaseModel):
    id: int
    employee_id: int
    date: date
    justification_type: str
    reason: str
    override_status: str
    document_path: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AttendanceJustificationCreate(BaseModel):
    employee_id: int
    date: date
    justification_type: str  # 'absence', 'lateness', 'other'
    reason: str
    override_status: str     # 'present', 'on_time'


# ── Audit Logs ────────────────────────────────────────────────────────────────

class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int]
    action: str
    entity: str
    entity_id: Optional[str]
    details: Optional[str]
    ip_address: Optional[str]
    created_at: datetime
    user: Optional[UserOut] = None

    class Config:
        from_attributes = True

class AuditLogCreate(BaseModel):
    user_id: Optional[int] = None
    action: str
    entity: str
    entity_id: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None


