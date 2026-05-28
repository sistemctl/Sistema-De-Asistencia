"""
Cliente ISAPI para el Hikvision DS-K1T323MBWX.
Incluye modo MOCK automático cuando el dispositivo no está disponible en red.
"""
import json
import random
from datetime import datetime, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

import requests
from requests.auth import HTTPDigestAuth

from backend.config import DEVICE_TIMEOUT, TIMEZONE


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
        try:
            return r.json()
        except Exception:
            try:
                import xml.etree.ElementTree as ET
                root = ET.fromstring(r.content)
                info = {}
                for child in root:
                    tag = child.tag.split('}')[-1]
                    info[tag] = child.text
                return {"DeviceInfo": info}
            except Exception as xml_err:
                raise ValueError(f"Failed to parse response as JSON or XML: {xml_err}") from xml_err

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
        import unicodedata
        # Normalizar tildes y eñes a ASCII básico para compatibilidad con el biométrico
        normalized_name = unicodedata.normalize('NFKD', name).encode('ASCII', 'ignore').decode('utf-8')
        
        user_info = {
            "employeeNo": user_id,
            "name": normalized_name,
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

        # El terminal Hikvision requiere el verbo PUT y la raíz UserInfo como objeto (no lista)
        payload = {"UserInfo": user_info}
        r = requests.put(
            f"{self.base_url}/AccessControl/UserInfo/SetUp?format=json",
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

    def delete_face_photo(self, user_id: str) -> dict:
        """Elimina la foto facial previa de un usuario del dispositivo si existe."""
        payload = {
            "FPIDList": [
                {"FPID": user_id}
            ]
        }
        try:
            r = requests.put(
                f"{self.base_url}/Intelligent/FDLib/FDSearch/Delete?format=json&FDID=1&faceLibType=blackFD",
                auth=HTTPDigestAuth(self.username, self.password),
                json=payload,
                timeout=self.timeout,
            )
            if r.status_code == 200:
                return r.json()
        except Exception as e:
            print(f"Advertencia al intentar eliminar foto de rostro previa para {user_id}: {e}")
        return {}

    def upload_face_photo(self, user_id: str, photo_bytes: bytes) -> dict:
        """Sube una foto facial en formato JPEG al dispositivo usando multipart/form-data."""
        import json
        
        # Eliminar la cara previa antes de subir la nueva para evitar errores de duplicidad en el firmware
        self.delete_face_photo(user_id)
        
        face_data = {
            "faceLibType": "blackFD",
            "FDID": "1",
            "FPID": user_id
        }
        files = {
            'FaceDataRecord': (None, json.dumps(face_data), 'application/json'),
            'FaceImage': ('face.jpg', photo_bytes, 'image/jpeg')
        }
        r = requests.post(
            f"{self.base_url}/Intelligent/FDLib/FaceDataRecord?format=json",
            auth=HTTPDigestAuth(self.username, self.password),
            files=files,
            timeout=self.timeout,
        )
        r.raise_for_status()
        return r.json()

    # ── Eventos de acceso / asistencia ────────────────────────────────────────

    def get_events(self, start_time: datetime, end_time: datetime, max_results: int = 1000) -> list[dict]:
        """Obtiene todos los eventos de acceso del dispositivo en un rango de tiempo usando paginación."""
        import uuid
        search_id = uuid.uuid4().hex
        all_events = []
        position = 0
        limit = 500  # Pedir de 500 en 500 para evitar saturar el dispositivo

        while True:

            # Formatear tiempos con offset ISO8601 correcto para la zona configurada
            tz = ZoneInfo(TIMEZONE)
            st_aware = start_time.replace(tzinfo=tz) if not start_time.tzinfo else start_time.astimezone(tz)
            et_aware = end_time.replace(tzinfo=tz) if not end_time.tzinfo else end_time.astimezone(tz)

            # Eliminar microsegundos porque Hikvision ISAPI no los soporta
            st_aware = st_aware.replace(microsecond=0)
            et_aware = et_aware.replace(microsecond=0)

            payload = {
                "AcsEventCond": {
                    "searchID": search_id,
                    "searchResultPosition": position,
                    "maxResults": limit,
                    "major": 5,
                    "minor": 0,
                    "startTime": st_aware.isoformat(),
                    "endTime": et_aware.isoformat(),
                }
            }
            try:
                r = requests.post(
                    f"{self.base_url}/AccessControl/AcsEvent?format=json",
                    auth=HTTPDigestAuth(self.username, self.password),
                    json=payload,
                    timeout=self.timeout,
                )
                r.raise_for_status()
            except Exception as e:
                if position == 0:
                    raise e
                # Si falla o hay timeout en la página N, devolver lo que ya logramos obtener
                break

            data = r.json()
            events_page = data.get("AcsEvent", {}).get("InfoList", [])
            
            if not events_page:
                break
            
            all_events.extend(events_page)
            if len(all_events) >= max_results:
                all_events = all_events[:max_results]
                break

            status_str = data.get("AcsEvent", {}).get("responseStatusStrg", "")
            if status_str != "MORE":
                break

            position += len(events_page)
            # Pequeña pausa para no saturar al dispositivo con 56 peticiones
            import time
            time.sleep(0.1)
            
            # Límite de seguridad para no quedar atrapados en un loop infinito
            if len(all_events) >= 50000:
                break

        return all_events

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
