import requests
from requests.auth import HTTPDigestAuth
from backend.database import SessionLocal
from backend.models import DeviceConfig

db = SessionLocal()
cfg = db.query(DeviceConfig).first()

payload = {
    "AcsEventCond": {
        "searchID": "test_search_123",
        "searchResultPosition": 0,
        "maxResults": 10,
        "major": 5,
        "minor": 0,
        "startTime": "2026-04-01T00:00:00-05:00",
        "endTime": "2026-05-20T00:00:00-05:00",
    }
}

try:
    r = requests.post(
        f"http://{cfg.ip_address}:{cfg.port}/ISAPI/AccessControl/AcsEvent?format=json",
        auth=HTTPDigestAuth(cfg.username, cfg.password),
        json=payload,
        timeout=10
    )
    print("Status:", r.status_code)
    print("Response:", r.text)
except requests.exceptions.RequestException as e:
    print(f"⚠️ El dispositivo físico en {cfg.ip_address} está fuera de línea o inaccesible: {e}")
    print("Esto es esperado si no estás en la red local del biométrico.")

