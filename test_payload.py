import sys
from datetime import datetime, timedelta
from backend.database import SessionLocal
from backend.models import DeviceConfig
from backend.services.hikvision import HikvisionClient
from backend.config import TIMEZONE
from zoneinfo import ZoneInfo
import uuid

db = SessionLocal()
cfg = db.query(DeviceConfig).first()

start_time = datetime(2026, 4, 1, 0, 0, 0)
end_time = datetime.now() + timedelta(days=1)

tz = ZoneInfo(TIMEZONE)
st_aware = start_time.replace(tzinfo=tz) if not start_time.tzinfo else start_time.astimezone(tz)
et_aware = end_time.replace(tzinfo=tz) if not end_time.tzinfo else end_time.astimezone(tz)

payload = {
    "AcsEventCond": {
        "searchID": uuid.uuid4().hex,
        "searchResultPosition": 0,
        "maxResults": 10,
        "major": 5,
        "minor": 0,
        "startTime": st_aware.isoformat(),
        "endTime": et_aware.isoformat(),
    }
}
print("PAYLOAD:", payload)

import requests
from requests.auth import HTTPDigestAuth
r = requests.post(
    f"http://{cfg.ip_address}:{cfg.port}/ISAPI/AccessControl/AcsEvent?format=json",
    auth=HTTPDigestAuth(cfg.username, cfg.password),
    json=payload,
    timeout=10
)
print("STATUS:", r.status_code)
print("RESPONSE:", r.text)
