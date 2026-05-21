from backend.database import SessionLocal
from backend.routers.dashboard import get_kpis, get_weekly_data

def test_dashboard():
    db = SessionLocal()
    try:
        kpis = get_kpis(db)
        print("KPIs:", kpis)
        
        weekly = get_weekly_data(db)
        print("Weekly Data:", weekly)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_dashboard()
