import sys
from datetime import datetime, date, time
from backend.database import SessionLocal
from backend.models import Employee, Schedule, AttendanceRecord, DeviceConfig
from backend.services.attendance_processor import process_daily_attendance_bulk

def run_test():
    db = SessionLocal()
    # Use a transaction so we can rollback and keep DB clean
    db.begin()
    try:
        # 1. Create a DeviceConfig if not exists
        cfg = db.query(DeviceConfig).first()
        if not cfg:
            cfg = DeviceConfig(
                name="Test Device",
                ip_address="127.0.0.1",
                port=80,
                is_online=True,
                last_successful_sync=datetime.now()
            )
            db.add(cfg)

        # 2. Create flexible schedule
        schedule = Schedule(
            name="Test Flexible Schedule 999",
            shift_type="flexible",
            work_days="1,2,3,4,5,6,7",
            work_start_time="00:00",
            work_end_time="00:00"
        )
        db.add(schedule)
        db.flush()

        # 3. Create dummy employee
        employee = Employee(
            employee_code="FLEX999",
            first_name="Test",
            last_name="Flexible",
            schedule_id=schedule.id,
            is_active=True
        )
        db.add(employee)
        db.flush()

        target_date = date(2026, 6, 28)

        # Test Case 1: Two punches (Entry at 12:00 PM, Exit at 8:00 PM)
        punch_in = AttendanceRecord(
            employee_id=employee.id,
            event_time=datetime.combine(target_date, time(12, 0, 0)),
            device_event_id="P1",
            auth_method="face"
        )
        punch_out = AttendanceRecord(
            employee_id=employee.id,
            event_time=datetime.combine(target_date, time(20, 0, 0)),
            device_event_id="P2",
            auth_method="face"
        )
        db.add_all([punch_in, punch_out])
        db.flush()

        # Process attendance
        summaries = process_daily_attendance_bulk(db, target_date)
        emp_summary = next((s for s in summaries if s["employee_id"] == employee.id), None)

        assert emp_summary is not None, "Employee summary not found"
        print("Summary (Two Punches):", emp_summary)
        
        assert emp_summary["is_present"] == True, "Should be present"
        assert emp_summary["is_late"] == False, "Should NOT be late"
        assert emp_summary["missing_punches"] == False, "Should NOT have missing punches"
        assert emp_summary["hours_worked"] == 8.0, f"Expected 8 hours worked, got {emp_summary['hours_worked']}"
        
        # Test Case 2: One punch (Entry at 10:00 AM, no exit)
        # Clear previous records
        db.delete(punch_in)
        db.delete(punch_out)
        db.flush()

        single_punch = AttendanceRecord(
            employee_id=employee.id,
            event_time=datetime.combine(target_date, time(10, 0, 0)),
            device_event_id="P3",
            auth_method="face"
        )
        db.add(single_punch)
        db.flush()

        summaries = process_daily_attendance_bulk(db, target_date)
        emp_summary = next((s for s in summaries if s["employee_id"] == employee.id), None)
        
        print("Summary (Single Punch):", emp_summary)
        assert emp_summary["is_present"] == True, "Should be present with one punch"
        assert emp_summary["missing_punches"] == True, "Should flag missing punches"
        assert emp_summary["punches"]["entry_1"] is not None
        assert emp_summary["punches"]["exit_1"] is None

        print("\n=== ALL TESTS PASSED SUCCESSFULLY! ===")

    except AssertionError as ae:
        print("Assertion Error:", ae)
        sys.exit(1)
    except Exception as e:
        print("Test failed with error:", e)
        sys.exit(1)
    finally:
        db.rollback()
        db.close()

if __name__ == "__main__":
    run_test()
