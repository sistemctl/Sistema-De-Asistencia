from datetime import datetime, date, timedelta
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from backend.models import Employee, AttendanceRecord, Schedule, DeviceConfig

def parse_time(time_str: str) -> Optional[datetime.time]:
    if not time_str:
        return None
    try:
        return datetime.strptime(time_str, "%H:%M").time()
    except ValueError:
        return None

def calculate_daily_summary(employee: Employee, records: List[AttendanceRecord], target_date: date, config: DeviceConfig) -> Dict:
    """
    Calculates the valid punches for an employee on a specific date, based on their schedule.
    """
    # Filter records for the target date
    day_records = [r for r in records if r.event_time.date() == target_date]
    # Sort chronologically
    day_records.sort(key=lambda r: r.event_time)

    # Base result structure
    summary = {
        "employee_id": employee.id,
        "employee_name": employee.full_name,
        "employee_code": employee.employee_code,
        "department": employee.department.name if employee.department else "-",
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
    }

    schedule = employee.schedule
    if not schedule:
        # If no schedule, fallback to simply first and last punch of the day
        if day_records:
            summary["punches"]["entry_1"] = day_records[0].event_time.isoformat()
            summary["is_present"] = True
            if len(day_records) > 1:
                summary["punches"]["exit_1"] = day_records[-1].event_time.isoformat()
            else:
                summary["missing_punches"] = True
        return summary

    summary["schedule_type"] = schedule.shift_type
    entry_tolerance = config.entry_tolerance_minutes if config else 10

    if schedule.shift_type == "continuous":
        # 1 Entry, 1 Exit
        work_start = parse_time(schedule.work_start_time)
        work_end = parse_time(schedule.work_end_time)

        if not work_start or not work_end:
            return summary

        # Find closest to start time for entry
        target_start = datetime.combine(target_date, work_start)
        target_end = datetime.combine(target_date, work_end)

        # Let's say entry window is [start - 3 hours, start + 4 hours]
        # Exit window is [end - 4 hours, end + 4 hours]
        # For simplicity, we just split the day in half between start and end.
        mid_point = target_start + (target_end - target_start) / 2

        entries = [r for r in day_records if r.event_time <= mid_point]
        exits = [r for r in day_records if r.event_time > mid_point]

        if entries:
            best_entry = min(entries, key=lambda r: abs((r.event_time - target_start).total_seconds()))
            summary["punches"]["entry_1"] = best_entry.event_time.isoformat()
            summary["is_present"] = True
            
            # Check late
            tolerance_limit = target_start + timedelta(minutes=entry_tolerance)
            if best_entry.event_time > tolerance_limit:
                summary["is_late"] = True

        if exits:
            best_exit = min(exits, key=lambda r: abs((r.event_time - target_end).total_seconds()))
            summary["punches"]["exit_1"] = best_exit.event_time.isoformat()

        if not entries or not exits:
            summary["missing_punches"] = True

    elif schedule.shift_type == "split":
        # 2 Entries, 2 Exits
        s_start = parse_time(schedule.work_start_time)
        s_lunch_start = parse_time(schedule.lunch_start_time)
        s_lunch_end = parse_time(schedule.lunch_end_time)
        s_end = parse_time(schedule.work_end_time)

        if not (s_start and s_lunch_start and s_lunch_end and s_end):
            return summary

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

        if w1_events:
            best = min(w1_events, key=lambda r: abs((r.event_time - t_start).total_seconds()))
            summary["punches"]["entry_1"] = best.event_time.isoformat()
            summary["is_present"] = True
            tolerance_limit = t_start + timedelta(minutes=entry_tolerance)
            if best.event_time > tolerance_limit:
                summary["is_late"] = True

        if w2_events:
            best = min(w2_events, key=lambda r: abs((r.event_time - t_lunch_s).total_seconds()))
            summary["punches"]["exit_1"] = best.event_time.isoformat()

        if w3_events:
            best = min(w3_events, key=lambda r: abs((r.event_time - t_lunch_e).total_seconds()))
            summary["punches"]["entry_2"] = best.event_time.isoformat()

        if w4_events:
            best = min(w4_events, key=lambda r: abs((r.event_time - t_end).total_seconds()))
            summary["punches"]["exit_2"] = best.event_time.isoformat()

        # Check missing
        punches = summary["punches"]
        if not punches["entry_1"] or not punches["exit_1"] or not punches["entry_2"] or not punches["exit_2"]:
            if punches["entry_1"]: # only mark missing if they actually showed up
                summary["missing_punches"] = True

    return summary

def process_daily_attendance_bulk(db: Session, target_date: date) -> List[Dict]:
    employees = db.query(Employee).filter(Employee.is_active == True).all()
    
    start_dt = datetime.combine(target_date, datetime.min.time())
    end_dt = datetime.combine(target_date, datetime.max.time())
    
    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.event_time >= start_dt,
        AttendanceRecord.event_time <= end_dt
    ).all()
    
    config = db.query(DeviceConfig).first()
    
    # group by employee
    from collections import defaultdict
    records_by_emp = defaultdict(list)
    for r in records:
        if r.employee_id:
            records_by_emp[r.employee_id].append(r)
            
    summaries = []
    for emp in employees:
        emp_records = records_by_emp.get(emp.id, [])
        summary = calculate_daily_summary(emp, emp_records, target_date, config)
        summaries.append(summary)
        
    return summaries


def process_attendance_report(
    db: Session,
    date_from: date,
    date_to: date,
    employee_id: Optional[int] = None,
    search: Optional[str] = None,
    granularity: str = "daily"
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
    if search:
        search_lower = search.lower()
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
    end_dt = datetime.combine(date_to, datetime.max.time())

    # 3. Fetch all attendance records for this period in a single query
    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.event_time >= start_dt,
        AttendanceRecord.event_time <= end_dt,
        AttendanceRecord.employee_id.in_(emp_ids)
    ).all()

    config = db.query(DeviceConfig).first()

    # Group records by (employee_id, date)
    records_by_emp_day = defaultdict(list)
    for r in records:
        if r.employee_id:
            r_date = r.event_time.date()
            records_by_emp_day[(r.employee_id, r_date)].append(r)

    # 4. Generate daily summaries
    daily_summaries = []
    for emp in employees:
        for d in days:
            emp_records = records_by_emp_day.get((emp.id, d), [])
            summary = calculate_daily_summary(emp, emp_records, d, config)
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

