import requests
from requests.auth import HTTPDigestAuth
from backend.database import SessionLocal
from backend.models import DeviceConfig

db = SessionLocal()
cfg = db.query(DeviceConfig).first()

url = f"http://{cfg.ip_address}:{cfg.port}/ISAPI/System/time"
r = requests.get(url, auth=HTTPDigestAuth(cfg.username, cfg.password))
print("Status:", r.status_code)
print("Response XML:")
print(r.text)
