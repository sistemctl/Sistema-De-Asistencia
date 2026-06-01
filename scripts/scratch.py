from backend.database import SessionLocal
from backend.models import SyncLog

db = SessionLocal()
logs = db.query(SyncLog).order_by(SyncLog.id.desc()).limit(5).all()
for l in logs:
    print(l.id, l.started_at, l.status)
