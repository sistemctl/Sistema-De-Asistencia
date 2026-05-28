"""
Pydantic schemas para validación de requests y serialización de responses.
"""
from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, EmailStr, field_validator


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

    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    role: str = "viewer"

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


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
    shift_type: str = "continuous"  # continuous / split
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

class ReportItem(BaseModel):
    employee_id: int
    employee_name: str
    employee_code: str
    department: str
    date: date
    schedule_type: str
    punches: ReportPunches
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
    entry_tolerance_minutes: Optional[int] = None
    exit_tolerance_minutes: Optional[int] = None

class DeviceConfigOut(BaseModel):
    id: int
    ip_address: str
    port: int
    username: str
    sync_interval_minutes: int
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
