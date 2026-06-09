from datetime import datetime, date, timedelta
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from backend.models import Employee, AttendanceRecord, Schedule, DeviceConfig, SystemConfig

def parse_time(time_str: str) -> Optional[datetime.time]:
    if not time_str:
        return None
    try:
        return datetime.strptime(time_str, "%H:%M").time()
    except ValueError:
        return None

def _apply_justification(summary: Dict, justification) -> Dict:
    summary["justification"] = None
    if justification:
        summary["justification"] = {
            "id": justification.id,
            "justification_type": justification.justification_type,
            "reason": justification.reason,
            "override_status": justification.override_status,
            "document_path": justification.document_path
        }
        if justification.override_status == "present":
            summary["is_present"] = True
            summary["missing_punches"] = False
        elif justification.override_status == "on_time":
            summary["is_present"] = True
            summary["is_late"] = False
    return summary

def calculate_daily_summary(employee: Employee, records: List[AttendanceRecord], target_date: date, config: SystemConfig, daily_schedule = None, is_holiday: bool = False, active_leave = None, justification = None) -> Dict:
    """
    Calculates the valid punches for an employee on a specific date, based on their schedule and system rules.
    """
    # Determine if there is a daily override, otherwise fallback to static schedule
    is_off = False
    if daily_schedule is not None:
        if daily_schedule.is_off:
            schedule = None
            is_off = True
        else:
            schedule = daily_schedule.schedule
    else:
        schedule = employee.schedule
        if schedule:
            try:
                work_days = [int(w) for w in schedule.work_days.split(",") if w.strip()]
                is_off = (target_date.weekday() + 1) not in work_days
            except Exception:
                is_off = False
        else:
            is_off = True

    if is_holiday:
        is_off = True

    if active_leave is not None:
        is_off = True

    # Filter records, checking if it is a night shift crossing midnight
    is_night_shift = False
    if schedule and schedule.shift_type == "continuous":
        work_start = parse_time(schedule.work_start_time)
        work_end = parse_time(schedule.work_end_time)
        if work_start and work_end and work_start > work_end:
            is_night_shift = True

    if is_night_shift:
        target_start = datetime.combine(target_date, work_start)
        target_end = datetime.combine(target_date + timedelta(days=1), work_end)
        window_start = target_start - timedelta(hours=4)
        window_end = target_end + timedelta(hours=4)
        day_records = [r for r in records if window_start <= r.event_time <= window_end]
    else:
        day_records = [r for r in records if r.event_time.date() == target_date]

    # Sort chronologically
    day_records.sort(key=lambda r: r.event_time)

    # Base result structure
    summary = {
        "employee_id": employee.id,
        "employee_name": employee.full_name,
        "employee_code": employee.employee_code,
        "department": employee.department.name if employee.department else "-",
        "photo_path": employee.photo_path,
        "date": target_date.isoformat(),
        "schedule_type": "none",
        "punches": {
            "entry_1": None,
            "exit_1": None,
            "entry_2": None,
            "exit_2": None
        },
        "total_raw_events": len(day_records),
        "is_present": False,
        "is_late": False,
        "missing_punches": False,
        "hours_worked": None,         # float hours, e.g. 8.5
        "hours_worked_str": "-",      # formatted, e.g. "8 h 30 min"
        "is_holiday": is_holiday,
        "leave_type": active_leave.leave_type if active_leave else None,
        "is_early_exit": False,
        "is_off": is_off
    }


    if not schedule:
        # If no schedule, fallback to simply first and last punch of the day
        if day_records:
            summary["punches"]["entry_1"] = day_records[0].event_time.isoformat()
            summary["is_present"] = True
            if len(day_records) > 1:
                summary["punches"]["exit_1"] = day_records[-1].event_time.isoformat()
                # Calculate hours worked
                worked_secs = (day_records[-1].event_time - day_records[0].event_time).total_seconds()
                summary["hours_worked"] = round(worked_secs / 3600, 2)
                h, m = divmod(int(worked_secs / 60), 60)
                summary["hours_worked_str"] = f"{h} h {m:02d} min"
            else:
                summary["missing_punches"] = True
        if is_off:
            summary["schedule_type"] = "off"
        return _apply_justification(summary, justification)

    summary["schedule_type"] = schedule.shift_type
    
    # Load advanced rules from SystemConfig
    tolerance_enable = config.tolerance_enable if (config and hasattr(config, 'tolerance_enable')) else True
    flexible_shift_enable = config.flexible_shift_enable if (config and hasattr(config, 'flexible_shift_enable')) else True
    flexible_shift_start_str = config.flexible_shift_start if (config and hasattr(config, 'flexible_shift_start')) else "09:00:00"
    flexible_shift_end_str = config.flexible_shift_end if (config and hasattr(config, 'flexible_shift_end')) else "18:00:00"

    entry_tolerance = config.entry_tolerance_minutes if (config and tolerance_enable) else 0
    exit_tolerance = config.exit_tolerance_minutes if (config and tolerance_enable) else 0
    require_checkin = config.require_checkin if config else True
    require_checkout = config.require_checkout if config else True
    
    mark_late_enable = config.mark_late_enable if config else True
    mark_late_limit_minutes = config.mark_late_limit_minutes if config else 0
    
    mark_absent_if_late_enable = config.mark_absent_if_late_enable if config else False
    mark_absent_if_late_limit_minutes = config.mark_absent_if_late_limit_minutes if config else 60
    
    mark_early_departure_enable = config.mark_early_departure_enable if config else True
    mark_early_departure_limit_minutes = config.mark_early_departure_limit_minutes if config else 0
    
    mark_absent_if_early_checkout_enable = config.mark_absent_if_early_checkout_enable if config else False
    mark_absent_if_early_checkout_limit_minutes = config.mark_absent_if_early_checkout_limit_minutes if config else 60
    
    no_checkin_enable = config.no_checkin_enable if config else True
    no_checkin_status = config.no_checkin_status if config else "Absent"
    no_checkout_enable = config.no_checkout_enable if config else True
    no_checkout_status = config.no_checkout_status if config else "Absent"

    if schedule.shift_type == "continuous":
        # Check if the schedule itself is flexible
        is_flexible_sched = False
        if flexible_shift_enable:
            sched_name = (schedule.name or "").lower()
            if "flexible" in sched_name or "flex" in sched_name:
                is_flexible_sched = True

        work_start = parse_time(schedule.work_start_time)
        work_end = parse_time(schedule.work_end_time)

        if not work_start or not work_end:
            return _apply_justification(summary, justification)

        if is_flexible_sched:
            # Flexible shift logic
            # Calculate duration of work required based on schedule times
            if work_start > work_end:
                duration_secs = (datetime.combine(target_date + timedelta(days=1), work_end) - datetime.combine(target_date, work_start)).total_seconds()
            else:
                duration_secs = (datetime.combine(target_date, work_end) - datetime.combine(target_date, work_start)).total_seconds()

            flex_start = parse_time(flexible_shift_start_str) or parse_time("09:00")
            flex_end = parse_time(flexible_shift_end_str) or parse_time("18:00")
            
            target_flex_start = datetime.combine(target_date, flex_start)
            target_flex_end = datetime.combine(target_date, flex_end)
            
            # Midpoint is target_flex_start + 6 hours
            mid_point = target_flex_start + timedelta(hours=6)
            
            entries = [r for r in day_records if r.event_time <= mid_point]
            exits = [r for r in day_records if r.event_time > mid_point]
            
            entry_time_dt = None
            if entries:
                best_entry = min(entries, key=lambda r: r.event_time)
                summary["punches"]["entry_1"] = best_entry.event_time.isoformat()
                summary["is_present"] = True
                entry_time_dt = best_entry.event_time
                
                # Check late status relative to target_flex_end
                diff_minutes = (best_entry.event_time - target_flex_end).total_seconds() / 60.0
                if diff_minutes > entry_tolerance:
                    if mark_absent_if_late_enable and diff_minutes > mark_absent_if_late_limit_minutes:
                        summary["is_present"] = False
                    elif mark_late_enable:
                        summary["is_late"] = True
            else:
                if require_checkin:
                    if no_checkin_enable:
                        if no_checkin_status == "Absent":
                            summary["is_present"] = False
                        elif no_checkin_status in ["Present", "Normal"]:
                            summary["is_present"] = True
                else:
                    summary["is_present"] = True

            if exits:
                best_exit = max(exits, key=lambda r: r.event_time)
                summary["punches"]["exit_1"] = best_exit.event_time.isoformat()
                
                # Check early exit relative to entry_time_dt + duration_secs
                if entry_time_dt:
                    expected_exit = entry_time_dt + timedelta(seconds=duration_secs)
                    diff_minutes = (expected_exit - best_exit.event_time).total_seconds() / 60.0
                    if diff_minutes > exit_tolerance:
                        summary["is_early_exit"] = True
                        if mark_absent_if_early_checkout_enable and diff_minutes > mark_absent_if_early_checkout_limit_minutes:
                            summary["is_present"] = False
            else:
                if require_checkout:
                    if no_checkout_enable:
                        if no_checkout_status == "Absent":
                            summary["is_present"] = False
                    summary["missing_punches"] = True
        else:
            # Standard continuous shift logic
            target_start = datetime.combine(target_date, work_start)
            if work_start > work_end:
                target_end = datetime.combine(target_date + timedelta(days=1), work_end)
            else:
                target_end = datetime.combine(target_date, work_end)
            mid_point = target_start + (target_end - target_start) / 2

            entries = [r for r in day_records if r.event_time <= mid_point]
            exits = [r for r in day_records if r.event_time > mid_point]

            if entries:
                best_entry = min(entries, key=lambda r: abs((r.event_time - target_start).total_seconds()))
                summary["punches"]["entry_1"] = best_entry.event_time.isoformat()
                summary["is_present"] = True
                
                # Check late/absent based on delay
                diff_minutes = (best_entry.event_time - target_start).total_seconds() / 60.0
                if mark_absent_if_late_enable and diff_minutes > mark_absent_if_late_limit_minutes:
                    summary["is_present"] = False
                elif mark_late_enable and diff_minutes > mark_late_limit_minutes:
                    summary["is_late"] = True
            else:
                if require_checkin:
                    if no_checkin_enable:
                        if no_checkin_status == "Absent":
                            summary["is_present"] = False
                        elif no_checkin_status in ["Present", "Normal"]:
                            summary["is_present"] = True
                else:
                    summary["is_present"] = True

            if exits:
                best_exit = min(exits, key=lambda r: abs((r.event_time - target_end).total_seconds()))
                summary["punches"]["exit_1"] = best_exit.event_time.isoformat()
                
                # Check early checkout
                diff_minutes = (target_end - best_exit.event_time).total_seconds() / 60.0
                if diff_minutes > 0: # Left early
                    summary["is_early_exit"] = True
                    if mark_absent_if_early_checkout_enable and diff_minutes > mark_absent_if_early_checkout_limit_minutes:
                        summary["is_present"] = False
            else:
                if require_checkout:
                    if no_checkout_enable:
                        if no_checkout_status == "Absent":
                            summary["is_present"] = False
                    summary["missing_punches"] = True

        # Calculate hours_worked for continuous shift (common to both flexible and strict)
        e1 = summary["punches"]["entry_1"]
        x1 = summary["punches"]["exit_1"]
        if e1 and x1:
            try:
                worked_secs = (datetime.fromisoformat(x1) - datetime.fromisoformat(e1)).total_seconds()
                if worked_secs > 0:
                    summary["hours_worked"] = round(worked_secs / 3600, 2)
                    h, m = divmod(int(worked_secs / 60), 60)
                    summary["hours_worked_str"] = f"{h} h {m:02d} min"
            except Exception:
                pass

    elif schedule.shift_type == "split":
        # 2 Entries, 2 Exits
        s_start = parse_time(schedule.work_start_time)
        s_lunch_start = parse_time(schedule.lunch_start_time)
        s_lunch_end = parse_time(schedule.lunch_end_time)
        s_end = parse_time(schedule.work_end_time)

        if not (s_start and s_lunch_start and s_lunch_end and s_end):
            return _apply_justification(summary, justification)

        t_start = datetime.combine(target_date, s_start)
        t_lunch_s = datetime.combine(target_date, s_lunch_start)
        t_lunch_e = datetime.combine(target_date, s_lunch_end)
        t_end = datetime.combine(target_date, s_end)

        mid_morning = t_start + (t_lunch_s - t_start) / 2
        mid_lunch = t_lunch_s + (t_lunch_e - t_lunch_s) / 2
        mid_afternoon = t_lunch_e + (t_end - t_lunch_e) / 2

        w1_events = [r for r in day_records if r.event_time <= mid_morning]
        w2_events = [r for r in day_records if mid_morning < r.event_time <= mid_lunch]
        w3_events = [r for r in day_records if mid_lunch < r.event_time <= mid_afternoon]
        w4_events = [r for r in day_records if r.event_time > mid_afternoon]

        # Entry 1
        if w1_events:
            best = min(w1_events, key=lambda r: abs((r.event_time - t_start).total_seconds()))
            summary["punches"]["entry_1"] = best.event_time.isoformat()
            summary["is_present"] = True
            
            diff_minutes = (best.event_time - t_start).total_seconds() / 60.0
            if mark_absent_if_late_enable and diff_minutes > mark_absent_if_late_limit_minutes:
                summary["is_present"] = False
            elif mark_late_enable and diff_minutes > mark_late_limit_minutes:
                summary["is_late"] = True
        else:
            if require_checkin:
                if no_checkin_enable:
                    if no_checkin_status == "Absent":
                        summary["is_present"] = False
                    elif no_checkin_status in ["Present", "Normal"]:
                        summary["is_present"] = True
            else:
                summary["is_present"] = True

        # Exit 1 (Lunch out)
        if w2_events:
            best = min(w2_events, key=lambda r: abs((r.event_time - t_lunch_s).total_seconds()))
            summary["punches"]["exit_1"] = best.event_time.isoformat()

        # Entry 2 (Lunch return)
        if w3_events:
            best = min(w3_events, key=lambda r: abs((r.event_time - t_lunch_e).total_seconds()))
            summary["punches"]["entry_2"] = best.event_time.isoformat()

        # Exit 2
        if w4_events:
            best = min(w4_events, key=lambda r: abs((r.event_time - t_end).total_seconds()))
            summary["punches"]["exit_2"] = best.event_time.isoformat()
            
            diff_minutes = (t_end - best.event_time).total_seconds() / 60.0
            if diff_minutes > 0: # Left early
                summary["is_early_exit"] = True
                if mark_absent_if_early_checkout_enable and diff_minutes > mark_absent_if_early_checkout_limit_minutes:
                    summary["is_present"] = False
        else:
            if require_checkout:
                if no_checkout_enable:
                    if no_checkout_status == "Absent":
                        summary["is_present"] = False

        # Check missing punches
        punches = summary["punches"]
        if not punches["entry_1"] or not punches["exit_1"] or not punches["entry_2"] or not punches["exit_2"]:
            if punches["entry_1"] or punches["exit_1"] or punches["entry_2"] or punches["exit_2"]:
                summary["missing_punches"] = True

        # Calculate hours_worked for split shift (session 1 + session 2)
        e1 = summary["punches"]["entry_1"]
        x1 = summary["punches"]["exit_1"]
        e2 = summary["punches"]["entry_2"]
        x2 = summary["punches"]["exit_2"]
        total_secs = 0
        try:
            if e1 and x1:
                total_secs += max((datetime.fromisoformat(x1) - datetime.fromisoformat(e1)).total_seconds(), 0)
            if e2 and x2:
                total_secs += max((datetime.fromisoformat(x2) - datetime.fromisoformat(e2)).total_seconds(), 0)
            if total_secs > 0:
                summary["hours_worked"] = round(total_secs / 3600, 2)
                h, m = divmod(int(total_secs / 60), 60)
                summary["hours_worked_str"] = f"{h} h {m:02d} min"
        except Exception:
            pass

    return _apply_justification(summary, justification)

def process_daily_attendance_bulk(db: Session, target_date: date) -> List[Dict]:
    employees = db.query(Employee).filter(Employee.is_active == True).all()
    
    start_dt = datetime.combine(target_date, datetime.min.time())
    end_dt = datetime.combine(target_date + timedelta(days=1), datetime.max.time())
    
    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.event_time >= start_dt,
        AttendanceRecord.event_time <= end_dt
    ).all()
    
    config = db.query(SystemConfig).first()
    
    # Preload daily schedule overrides
    from backend.models import EmployeeDailySchedule, Holiday, EmployeeLeave
    is_holiday = db.query(Holiday).filter(Holiday.date == target_date, Holiday.is_active == True).first() is not None

    dailies = db.query(EmployeeDailySchedule).filter(
        EmployeeDailySchedule.date == target_date
    ).all()
    dailies_map = {d.employee_id: d for d in dailies}

    # Preload active leaves
    leaves = db.query(EmployeeLeave).filter(
        EmployeeLeave.start_date <= target_date,
        EmployeeLeave.end_date >= target_date
    ).all()
    leaves_map = {l.employee_id: l for l in leaves}

    # Preload justifications
    from backend.models import AttendanceJustification
    justs = db.query(AttendanceJustification).filter(
        AttendanceJustification.date == target_date
    ).all()
    justs_map = {j.employee_id: j for j in justs}
    
    # group by employee
    from collections import defaultdict
    records_by_emp = defaultdict(list)
    for r in records:
        if r.employee_id:
            records_by_emp[r.employee_id].append(r)
            
    summaries = []
    for emp in employees:
        emp_records = records_by_emp.get(emp.id, [])
        summary = calculate_daily_summary(
            emp, 
            emp_records, 
            target_date, 
            config, 
            daily_schedule=dailies_map.get(emp.id),
            is_holiday=is_holiday,
            active_leave=leaves_map.get(emp.id),
            justification=justs_map.get(emp.id)
        )
        summaries.append(summary)
        
    return summaries



def process_attendance_report(
    db: Session,
    date_from: date,
    date_to: date,
    employee_id: Optional[int] = None,
    search: Optional[str] = None,
    granularity: str = "daily",
    department_id: Optional[int] = None,
    position_id: Optional[int] = None,
    schedule_id: Optional[int] = None
) -> List[Dict]:
    """
    Processes and aggregates attendance summaries for a range of dates,
    with daily, weekly, or monthly granularity.
    """
    from backend.models import Employee, AttendanceRecord, DeviceConfig
    from collections import defaultdict
    from datetime import timedelta

    # 1. Build employee query
    employee_query = db.query(Employee).filter(Employee.is_active == True)
    if employee_id:
        employee_query = employee_query.filter(Employee.id == employee_id)
    if department_id:
        employee_query = employee_query.filter(Employee.department_id == department_id)
    if position_id:
        employee_query = employee_query.filter(Employee.position_id == position_id)
    if schedule_id:
        employee_query = employee_query.filter(Employee.schedule_id == schedule_id)
    if search:
        employee_query = employee_query.filter(
            (Employee.first_name.ilike(f"%{search}%")) |
            (Employee.last_name.ilike(f"%{search}%")) |
            (Employee.employee_code.ilike(f"%{search}%"))
        )
    employees = employee_query.all()
    emp_ids = [emp.id for emp in employees]

    if not emp_ids:
        return []

    # 2. Get list of days in range
    delta = date_to - date_from
    days = [date_from + timedelta(days=i) for i in range(delta.days + 1)]

    start_dt = datetime.combine(date_from, datetime.min.time())
    end_dt = datetime.combine(date_to + timedelta(days=1), datetime.max.time())

    # 3. Fetch all attendance records for this period in a single query
    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.event_time >= start_dt,
        AttendanceRecord.event_time <= end_dt,
        AttendanceRecord.employee_id.in_(emp_ids)
    ).all()

    config = db.query(SystemConfig).first()

    # Group records by (employee_id, date)
    records_by_emp_day = defaultdict(list)
    for r in records:
        if r.employee_id:
            r_date = r.event_time.date()
            records_by_emp_day[(r.employee_id, r_date)].append(r)

    # Preload daily schedule overrides
    from backend.models import EmployeeDailySchedule, Holiday, EmployeeLeave
    holidays_in_range = db.query(Holiday).filter(
        Holiday.date >= date_from,
        Holiday.date <= date_to,
        Holiday.is_active == True
    ).all()
    holiday_dates = {h.date for h in holidays_in_range}

    dailies = db.query(EmployeeDailySchedule).filter(
        EmployeeDailySchedule.employee_id.in_(emp_ids),
        EmployeeDailySchedule.date >= date_from,
        EmployeeDailySchedule.date <= date_to
    ).all()
    dailies_map = {(d.employee_id, d.date): d for d in dailies}

    # Preload active leaves for the range
    leaves_in_range = db.query(EmployeeLeave).filter(
        EmployeeLeave.employee_id.in_(emp_ids),
        EmployeeLeave.start_date <= date_to,
        EmployeeLeave.end_date >= date_from
    ).all()
    
    leaves_by_emp_day = {}
    for leave in leaves_in_range:
        cur_date = max(leave.start_date, date_from)
        end_limit = min(leave.end_date, date_to)
        while cur_date <= end_limit:
            leaves_by_emp_day[(leave.employee_id, cur_date)] = leave
            cur_date += timedelta(days=1)

    # Preload justifications
    from backend.models import AttendanceJustification
    justs_in_range = db.query(AttendanceJustification).filter(
        AttendanceJustification.employee_id.in_(emp_ids),
        AttendanceJustification.date >= date_from,
        AttendanceJustification.date <= date_to
    ).all()
    justs_by_emp_day = {(j.employee_id, j.date): j for j in justs_in_range}

    # 4. Generate daily summaries
    daily_summaries = []
    for emp in employees:
        for d in days:
            emp_records = records_by_emp_day.get((emp.id, d), [])
            summary = calculate_daily_summary(
                emp, 
                emp_records, 
                d, 
                config, 
                daily_schedule=dailies_map.get((emp.id, d)),
                is_holiday=(d in holiday_dates),
                active_leave=leaves_by_emp_day.get((emp.id, d)),
                justification=justs_by_emp_day.get((emp.id, d))
            )
            daily_summaries.append(summary)


    if granularity == "daily":
        daily_summaries.sort(key=lambda s: (s["date"], s["employee_name"]), reverse=True)
        return daily_summaries

    elif granularity == "weekly":
        # Group by employee_id, year, and week
        weekly_groups = defaultdict(list)
        for s in daily_summaries:
            s_date = date.fromisoformat(s["date"])
            iso_yr, iso_wk, _ = s_date.isocalendar()
            weekly_groups[(s["employee_id"], iso_yr, iso_wk)].append(s)

        weekly_summaries = []
        for (emp_id, yr, wk), day_sums in weekly_groups.items():
            first = day_sums[0]
            p_start = date.fromisocalendar(yr, wk, 1)
            p_end = date.fromisocalendar(yr, wk, 7)

            total_raw = sum(x["total_raw_events"] for x in day_sums)
            is_present = any(x["is_present"] for x in day_sums)
            is_late = any(x["is_late"] for x in day_sums)
            missing_punches = any(x["missing_punches"] for x in day_sums)

            weekly_summaries.append({
                "employee_id": emp_id,
                "employee_name": first["employee_name"],
                "employee_code": first["employee_code"],
                "department": first["department"],
                "photo_path": first.get("photo_path"),
                "date": p_start.isoformat(),
                "schedule_type": first["schedule_type"],
                "punches": {
                    "entry_1": None,
                    "exit_1": None,
                    "entry_2": None,
                    "exit_2": None
                },
                "total_raw_events": total_raw,
                "is_present": is_present,
                "is_late": is_late,
                "missing_punches": missing_punches,
                "period_start": p_start.isoformat(),
                "period_end": p_end.isoformat(),
            })

        weekly_summaries.sort(key=lambda s: (s["period_start"], s["employee_name"]), reverse=True)
        return weekly_summaries

    elif granularity == "monthly":
        # Group by employee_id, year, and month
        monthly_groups = defaultdict(list)
        for s in daily_summaries:
            s_date = date.fromisoformat(s["date"])
            monthly_groups[(s["employee_id"], s_date.year, s_date.month)].append(s)

        monthly_summaries = []
        for (emp_id, yr, mo), day_sums in monthly_groups.items():
            first = day_sums[0]
            p_start = date(yr, mo, 1)
            if mo == 12:
                p_end = date(yr + 1, 1, 1) - timedelta(days=1)
            else:
                p_end = date(yr, mo + 1, 1) - timedelta(days=1)

            total_raw = sum(x["total_raw_events"] for x in day_sums)
            is_present = any(x["is_present"] for x in day_sums)
            is_late = any(x["is_late"] for x in day_sums)
            missing_punches = any(x["missing_punches"] for x in day_sums)

            monthly_summaries.append({
                "employee_id": emp_id,
                "employee_name": first["employee_name"],
                "employee_code": first["employee_code"],
                "department": first["department"],
                "photo_path": first.get("photo_path"),
                "date": p_start.isoformat(),
                "schedule_type": first["schedule_type"],
                "punches": {
                    "entry_1": None,
                    "exit_1": None,
                    "entry_2": None,
                    "exit_2": None
                },
                "total_raw_events": total_raw,
                "is_present": is_present,
                "is_late": is_late,
                "missing_punches": missing_punches,
                "period_start": p_start.isoformat(),
                "period_end": p_end.isoformat(),
            })

        monthly_summaries.sort(key=lambda s: (s["period_start"], s["employee_name"]), reverse=True)
        return monthly_summaries

