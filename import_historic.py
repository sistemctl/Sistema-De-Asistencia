import sys
from datetime import datetime, timedelta
from backend.database import SessionLocal
from backend.models import DeviceConfig
from backend.services.hikvision import HikvisionClient
from backend.services.scheduler import _process_events
import time
import requests
from requests.auth import HTTPDigestAuth
import uuid
from zoneinfo import ZoneInfo
from backend.config import TIMEZONE

db = SessionLocal()
cfg = db.query(DeviceConfig).first()
client = HikvisionClient(cfg.ip_address, cfg.port, cfg.username, cfg.password)

current_start = datetime(2026, 4, 1, 0, 0, 0)
final_end = datetime.now() + timedelta(days=1)

total_downloaded = 0
total_inserted = 0
tz = ZoneInfo(TIMEZONE)

print("Iniciando extracción profunda segmentada por fechas...")

while current_start < final_end:
    st_aware = current_start.replace(tzinfo=tz) if not current_start.tzinfo else current_start.astimezone(tz)
    st_aware = st_aware.replace(microsecond=0)
    
    search_id = uuid.uuid4().hex
    position = 0
    limit = 500
    last_event_time_str = None

    while True:
        payload = {
            "AcsEventCond": {
                "searchID": search_id,
                "searchResultPosition": position,
                "maxResults": limit,
                "major": 5,
                "minor": 0,
                "startTime": st_aware.isoformat(),
                "endTime": final_end.replace(tzinfo=tz).replace(microsecond=0).isoformat(),
            }
        }
        
        events_page = None
        for attempt in range(3):
            try:
                r = requests.post(
                    f"{client.base_url}/AccessControl/AcsEvent?format=json",
                    auth=HTTPDigestAuth(client.username, client.password),
                    json=payload,
                    timeout=30
                )
                r.raise_for_status()
                data = r.json()
                events_page = data.get("AcsEvent", {}).get("InfoList", [])
                break
            except Exception as e:
                print(f"Error en pos {position} (intento {attempt+1}): {e}")
                time.sleep(1)
                
        if events_page is None:
            print("Fallo definitivo tras reintentos.")
            break
            
        if not events_page:
            break
            
        total_downloaded += len(events_page)
        last_event_time_str = events_page[-1].get("time")
        
        new_count = _process_events(db, events_page, cfg)
        total_inserted += new_count
        db.commit()
        
        status_str = data.get("AcsEvent", {}).get("responseStatusStrg", "")
        if status_str != "MORE":
            break
            
        position += len(events_page)
        time.sleep(0.1)
            
    if not last_event_time_str:
        # No se encontraron eventos desde current_start hasta final_end
        break
        
    # Avanzar current_start al último evento encontrado + 1 segundo
    try:
        dt = datetime.fromisoformat(last_event_time_str.replace("Z", "+00:00"))
        current_start = dt.replace(tzinfo=None) + timedelta(seconds=1)
        print(f"Límite de búsqueda alcanzado. Reanudando desde: {current_start}")
    except:
        current_start += timedelta(days=1)

print(f"¡Finalizado! Descargados: {total_downloaded}, Insertados válidos: {total_inserted}")
