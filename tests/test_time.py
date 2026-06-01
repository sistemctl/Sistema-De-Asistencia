from backend.database import SessionLocal
from backend.models import DeviceConfig
from backend.services.hikvision import HikvisionClient

db = SessionLocal()
cfg = db.query(DeviceConfig).first()
client = HikvisionClient(cfg.ip_address, cfg.port, cfg.username, cfg.password)
try:
    info = client.get_device_info()
    print("Device Info Time:", info)
except Exception as e:
    print("Error:", e)
