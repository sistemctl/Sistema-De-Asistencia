"""
Cliente ISAPI para el Hikvision DS-K1T323MBWX.
Incluye modo MOCK automático cuando el dispositivo no está disponible en red.
"""
import json
import random
from datetime import datetime, timedelta
from typing import Optional

import requests
from requests.auth import HTTPDigestAuth

from backend.config import DEVICE_TIMEOUT


class HikvisionClient:
    """Cliente HTTP que se comunica con el dispositivo via ISAPI + Digest Auth."""

    def __init__(self, ip: str, port: int, username: str, password: str):
        self.base_url = f"http://{ip}:{port}/ISAPI"
        self.username = username
        self.password = password
        self.timeout = DEVICE_TIMEOUT
        self._is_online: Optional[bool] = None

    # ── Conectividad ──────────────────────────────────────────────────────────

    def check_online(self) -> bool:
        """Verifica si el dispositivo responde. Actualiza self._is_online."""
        try:
            r = requests.get(
                f"{self.base_url}/System/deviceInfo",
                auth=HTTPDigestAuth(self.username, self.password),
                timeout=self.timeout,
            )
            self._is_online = r.status_code in (200, 401)
        except Exception:
            self._is_online = False
        return self._is_online

    @property
    def is_online(self) -> bool:
        if self._is_online is None:
            self.check_online()
        return self._is_online

    # ── Info del dispositivo ──────────────────────────────────────────────────

    def get_device_info(self) -> dict:
        r = requests.get(
            f"{self.base_url}/System/deviceInfo",
            auth=HTTPDigestAuth(self.username, self.password),
            timeout=self.timeout,
        )
        r.raise_for_status()
        return r.json()

    # ── Usuarios ──────────────────────────────────────────────────────────────

    def list_users(self, start: int = 1, limit: int = 50, search_id: str = None) -> dict:
        if not search_id:
            import uuid
            search_id = uuid.uuid4().hex
        payload = {
            "UserInfoSearchCond": {
                "searchID": search_id,
                "searchResultPosition": start,
                "maxResults": limit,
            }
        }
        r = requests.post(
            f"{self.base_url}/AccessControl/UserInfo/Search?format=json",
            auth=HTTPDigestAuth(self.username, self.password),
            json=payload,
            timeout=self.timeout,
        )
        r.raise_for_status()
        return r.json()

    def create_user(self, user_id: str, name: str, card_number: Optional[str] = None) -> dict:
        user_info = {
            "employeeNo": user_id,
            "name": name,
            "userType": "normal",
            "Valid": {
                "enable": True,
                "beginTime": "2024-01-01T00:00:00",
                "endTime": "2030-12-31T23:59:59",
                "timeType": "local",
            },
            "doorRight": "1",
            "RightPlan": [{"doorNo": 1, "planTemplateNo": "1"}],
        }
        if card_number:
            user_info["CardInfo"] = [{"cardNo": card_number, "cardType": "normalCard"}]

        payload = {"UserInfo": [user_info]}
        r = requests.post(
            f"{self.base_url}/AccessControl/UserInfo/Record?format=json",
            auth=HTTPDigestAuth(self.username, self.password),
            json=payload,
            timeout=self.timeout,
        )
        r.raise_for_status()
        return r.json()

    def delete_user(self, user_id: str) -> dict:
        payload = {"UserInfoDelCond": {"EmployeeNoList": [{"employeeNo": user_id}]}}
        r = requests.put(
            f"{self.base_url}/AccessControl/UserInfo/Delete?format=json",
            auth=HTTPDigestAuth(self.username, self.password),
            json=payload,
            timeout=self.timeout,
        )
        r.raise_for_status()
        return r.json()

    def upload_face_photo(self, user_id: str, photo_bytes: bytes) -> dict:
        """Sube una foto facial en formato JPEG al dispositivo."""
        import base64
        payload = {
            "FaceDataRecord": [{
                "employeeNo": user_id,
                "faceData": base64.b64encode(photo_bytes).decode(),
            }]
        }
        r = requests.post(
            f"{self.base_url}/Intelligent/FDLib/FaceDataRecord?format=json",
            auth=HTTPDigestAuth(self.username, self.password),
            json=payload,
            timeout=self.timeout,
        )
        r.raise_for_status()
        return r.json()

    # ── Eventos de acceso / asistencia ────────────────────────────────────────

    def get_events(self, start_time: datetime, end_time: datetime, max_results: int = 1000) -> list[dict]:
        """Obtiene eventos de acceso del dispositivo en un rango de tiempo."""
        import uuid
        payload = {
            "AcsEventCond": {
                "searchID": uuid.uuid4().hex,
                "searchResultPosition": 0,
                "maxResults": max_results,
                "major": 5,
                "minor": 75,
                "startTime": start_time.strftime("%Y-%m-%dT%H:%M:%S+00:00"),
                "endTime": end_time.strftime("%Y-%m-%dT%H:%M:%S+00:00"),
            }
        }
        r = requests.post(
            f"{self.base_url}/AccessControl/AcsEvent?format=json",
            auth=HTTPDigestAuth(self.username, self.password),
            json=payload,
            timeout=self.timeout,
        )
        r.raise_for_status()
        data = r.json()
        return data.get("AcsEvent", {}).get("InfoList", [])

    # ── Capacidades ───────────────────────────────────────────────────────────

    def get_capabilities(self) -> dict:
        r = requests.get(
            f"{self.base_url}/AccessControl/capabilities",
            auth=HTTPDigestAuth(self.username, self.password),
            timeout=self.timeout,
        )
        r.raise_for_status()
        return r.json()


# ── Modo MOCK / Simulación ────────────────────────────────────────────────────

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
    now = datetime.utcnow()
    day = since.date()

    # Solo generar eventos para días pasados hasta hoy
    while day <= now.date() and len(events) < max_events:
        if day.weekday() < 5:  # Lunes a viernes
            for uid in random.sample(employee_ids, min(len(employee_ids), random.randint(7, len(employee_ids)))):
                # Entrada
                entry_hour = random.randint(7, 9)
                entry_min = random.randint(0, 59)
                entry_dt = datetime(day.year, day.month, day.day, entry_hour, entry_min)
                events.append({
                    "eventId": f"MOCK-{day}-{uid}-IN",
                    "employeeNoString": uid,
                    "time": entry_dt.strftime("%Y-%m-%dT%H:%M:%S"),
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
                    exit_dt = datetime(day.year, day.month, day.day, exit_hour, exit_min)
                    events.append({
                        "eventId": f"MOCK-{day}-{uid}-OUT",
                        "employeeNoString": uid,
                        "time": exit_dt.strftime("%Y-%m-%dT%H:%M:%S"),
                        "major": 5,
                        "minor": 75,
                        "currentVerifyMode": "faceNotCompare",
                        "name": random.choice(MOCK_NAMES),
                        "_mock": True,
                    })
        day += timedelta(days=1)

    return events[:max_events]
