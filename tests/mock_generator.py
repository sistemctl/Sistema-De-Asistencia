import random
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

TIMEZONE = "America/Bogota"

MOCK_NAMES = [
    "Carlos García", "María López", "Juan Martínez", "Ana Rodríguez",
    "Pedro Sánchez", "Laura González", "Miguel Hernández", "Sofía Díaz",
    "Luis Pérez", "Carmen Torres",
]

def generate_mock_events(since: datetime, employee_ids: list[str], max_events: int = 20) -> list[dict]:
    """
    Genera eventos de asistencia ficticios para desarrollo sin dispositivo.
    Simula entradas entre 07:30 y 09:30 y salidas entre 17:00 y 18:30.
    """
    events = []
    tz = ZoneInfo(TIMEZONE)
    now = datetime.now(tz)
    day = since.date()

    # Solo generar eventos para días pasados hasta hoy
    while day <= now.date() and len(events) < max_events:
        if day.weekday() < 5:  # Lunes a viernes
            for uid in random.sample(employee_ids, min(len(employee_ids), random.randint(7, len(employee_ids)))):
                # Entrada
                entry_hour = random.randint(7, 9)
                entry_min = random.randint(0, 59)
                entry_dt = datetime(day.year, day.month, day.day, entry_hour, entry_min, tzinfo=tz)
                events.append({
                    "eventId": f"MOCK-{day}-{uid}-IN",
                    "employeeNoString": uid,
                    "time": entry_dt.isoformat(),
                    "major": 5,
                    "minor": 75,
                    "currentVerifyMode": "faceNotCompare",
                    "name": random.choice(MOCK_NAMES),
                    "_mock": True,
                })
                # Salida
                if random.random() > 0.1:
                    exit_hour = random.randint(17, 18)
                    exit_min = random.randint(0, 59)
                    exit_dt = datetime(day.year, day.month, day.day, exit_hour, exit_min, tzinfo=tz)
                    events.append({
                        "eventId": f"MOCK-{day}-{uid}-OUT",
                        "employeeNoString": uid,
                        "time": exit_dt.isoformat(),
                        "major": 5,
                        "minor": 75,
                        "currentVerifyMode": "faceNotCompare",
                        "name": random.choice(MOCK_NAMES),
                        "_mock": True,
                    })
        day += timedelta(days=1)

    return events[:max_events]
