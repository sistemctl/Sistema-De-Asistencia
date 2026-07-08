"""
Cliente ISAPI para el Hikvision DS-K1T323MBWX.
Incluye modo MOCK automático cuando el dispositivo no está disponible en red.
"""
import logging

logger = logging.getLogger(__name__)

import json
import random
import xml.etree.ElementTree as ET
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

        # Connection pooling + digest authentication caching
        self.session = requests.Session()
        self.session.auth = HTTPDigestAuth(self.username, self.password)
        # Hace que TODAS las peticiones reintenten ante 401 (nonce Digest vencido
        # o protección anti-avalancha del equipo tras muchas peticiones seguidas).
        self._install_resilient_request()

    def _install_resilient_request(self):
        """Envuelve session.request para reintentar los 401 con re-autenticación.

        Los terminales Hikvision empiezan a devolver 401 cuando reciben muchas
        peticiones muy seguidas (el nonce de Digest caduca o se activa su
        protección). Ante un 401 renovamos la autenticación (handshake nuevo),
        cerramos las conexiones en caché y esperamos con backoff antes de reintentar."""
        import time

        original_request = self.session.request

        def resilient_request(method, url, **kwargs):
            kwargs.setdefault("timeout", self.timeout)
            resp = None
            for attempt in range(5):
                resp = original_request(method, url, **kwargs)
                if resp.status_code != 401:
                    return resp
                # 401: renovar autenticación y reintentar tras una espera creciente.
                self.session.auth = HTTPDigestAuth(self.username, self.password)
                try:
                    self.session.close()
                except Exception:
                    pass
                time.sleep(0.8 * (attempt + 1))
            return resp

        self.session.request = resilient_request

    # ── Conectividad ──────────────────────────────────────────────────────────

    def check_online(self) -> bool:
        """Verifica si el dispositivo responde. Actualiza self._is_online."""
        try:
            r = self.session.get(
                f"{self.base_url}/System/deviceInfo",
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
        r = self.session.get(
            f"{self.base_url}/System/deviceInfo",
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
        r = self.session.post(
            f"{self.base_url}/AccessControl/UserInfo/Search?format=json",
            json=payload,
            timeout=self.timeout,
        )
        r.raise_for_status()
        return r.json()

    def create_user(self, user_id: str, name: str, card_number: Optional[str] = None, long_term: bool = True) -> dict:
        import unicodedata
        # Normalizar tildes y eñes a ASCII básico para compatibilidad con el biométrico
        normalized_name = unicodedata.normalize('NFKD', name).encode('ASCII', 'ignore').decode('utf-8')

        # long_term=True -> "Long-Term Effective User" (usuario permanente):
        # en el ISAPI se representa con Valid.enable = False (sin restricción de vigencia).
        # long_term=False -> vigencia acotada entre beginTime y endTime.
        user_info = {
            "employeeNo": user_id,
            "name": normalized_name,
            "userType": "normal",
            "Valid": {
                "enable": not long_term,
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
        r = self.session.put(
            f"{self.base_url}/AccessControl/UserInfo/SetUp?format=json",
            json=payload,
            timeout=self.timeout,
        )
        r.raise_for_status()

        # Primero, eliminar cualquier tarjeta anterior vinculada a este empleado en el biométrico
        try:
            del_payload = {
                "CardInfoDelCond": {
                    "EmployeeNoList": [
                        {
                            "employeeNo": user_id
                        }
                    ]
                }
            }
            r_del = self.session.put(
                f"{self.base_url}/AccessControl/CardInfo/Delete?format=json",
                json=del_payload,
                timeout=self.timeout,
            )
            r_del.raise_for_status()
        except Exception as del_err:
            logger.warning(f"No se pudieron eliminar tarjetas previas para {user_id}: {del_err}")

        # Asegurar el registro de la tarjeta/QR de forma explícita en el biométrico
        if card_number:
            try:
                card_payload = {
                    "CardInfo": {
                        "employeeNo": user_id,
                        "cardNo": card_number,
                        "cardType": "normalCard"
                    }
                }
                r_card = self.session.put(
                    f"{self.base_url}/AccessControl/CardInfo/SetUp?format=json",
                    json=card_payload,
                    timeout=self.timeout,
                )
                r_card.raise_for_status()
            except Exception as card_err:
                logger.error(f"Error al registrar tarjeta {card_number} por separado para {user_id}: {card_err}")

        return r.json()

    def delete_user(self, user_id: str) -> dict:
        payload = {"UserInfoDelCond": {"EmployeeNoList": [{"employeeNo": user_id}]}}
        r = self.session.put(
            f"{self.base_url}/AccessControl/UserInfo/Delete?format=json",
            json=payload,
            timeout=self.timeout,
        )
        r.raise_for_status()
        return r.json()

    def delete_face_photo(self, user_id: str) -> dict:
        """Elimina la foto facial previa de un usuario del dispositivo si existe.

        En este terminal (DS-K1T344MBFWX-E1) la librería facial vive en el namespace
        Intelligent/FDLib. Las rutas AccessControl/FaceInfo devuelven 'notSupport',
        por eso se borra el rostro por su FPID (== employeeNo) vía FDSearch/Delete."""
        payload = {"FPID": [{"value": user_id}]}
        try:
            r = self.session.put(
                f"{self.base_url}/Intelligent/FDLib/FDSearch/Delete?format=json&FDID=1&faceLibType=blackFD",
                json=payload,
                timeout=self.timeout,
            )
            r.raise_for_status()
            return r.json()
        except Exception as e:
            logger.error(f"Advertencia al intentar eliminar foto de rostro previa para {user_id}: {e}")
        return {}

    def _post_face(self, user_id: str, photo_bytes: bytes):
        """Realiza el POST de la foto al endpoint FaceDataRecord y devuelve la respuesta HTTP."""
        import json
        face_data = {
            "faceLibType": "blackFD",
            "FDID": "1",
            "FPID": user_id,
            "employeeNo": user_id
        }
        files = {
            'FaceDataRecord': (None, json.dumps(face_data), 'application/json'),
            'img': ('face.jpg', photo_bytes, 'image/jpeg')
        }
        return self.session.post(
            f"{self.base_url}/Intelligent/FDLib/FaceDataRecord?format=json",
            files=files,
            timeout=self.timeout,
        )

    @staticmethod
    def _face_sub_code(response) -> Optional[str]:
        try:
            err_data = response.json()
        except Exception:
            return None
        return err_data.get("subStatusCode") or err_data.get("ResponseStatus", {}).get("subStatusCode")

    def upload_face_photo(self, user_id: str, photo_bytes: bytes) -> dict:
        """Sube una foto facial en formato JPEG al dispositivo usando multipart/form-data.

        El endpoint FaceDataRecord NO reemplaza un rostro existente: si el usuario ya
        tiene foto, responde 'deviceUserAlreadyExistFace'. En ese caso borramos el
        rostro previo y reintentamos, logrando así una actualización de foto."""
        r = self._post_face(user_id, photo_bytes)

        # Si el rostro ya existe, borrarlo y reintentar una vez (comportamiento de "actualizar foto").
        if not r.ok and self._face_sub_code(r) == "deviceUserAlreadyExistFace":
            logger.info(f"El usuario {user_id} ya tenía rostro; se elimina y se vuelve a subir la nueva foto.")
            self.delete_face_photo(user_id)
            r = self._post_face(user_id, photo_bytes)

        try:
            r.raise_for_status()
            return r.json()
        except requests.exceptions.HTTPError as e:
            try:
                err_data = r.json()
                sub_code = err_data.get("subStatusCode") or err_data.get("ResponseStatus", {}).get("subStatusCode")
                status_str = err_data.get("statusString") or err_data.get("ResponseStatus", {}).get("statusString")

                # Mapeo de errores comunes de Hikvision
                error_mappings = {
                    "noFaceDetected": "No se detectó ningún rostro en la foto. Asegúrese de que el rostro esté descubierto y de frente.",
                    "faceQualityBad": "La calidad de la imagen es insuficiente (puede estar borrosa, mal iluminada o de lado).",
                    "faceSizeTooSmall": "El rostro en la imagen es demasiado pequeño.",
                    "faceSizeTooLarge": "El rostro en la imagen es demasiado grande.",
                    "imageSizeLimit": "El tamaño de la imagen supera el límite permitido por el dispositivo.",
                    "photoSizeError": "El tamaño de la imagen supera el límite permitido por el dispositivo.",
                    "invalidPhotoFormat": "El formato del archivo no es compatible. Suba una foto en formato JPG/JPEG estándar.",
                    "SubpicAnalysisModelingError": "El equipo no pudo procesar el rostro de esta imagen. Use una foto más nítida, de frente y bien iluminada.",
                    "faceSubjectAlreadyExist": "Este rostro ya está registrado en el dispositivo."
                }

                msg = error_mappings.get(sub_code)
                if msg:
                    raise Exception(f"El dispositivo rechazó la foto: {msg} (código: {sub_code})")
                elif status_str:
                    raise Exception(f"El dispositivo rechazó la foto: {status_str} (código: {sub_code or 'N/A'})")
            except Exception as json_err:
                if "El dispositivo rechazó" in str(json_err):
                    raise json_err
            # Si no pudimos parsear el JSON o no coincide, lanzar el error genérico
            raise Exception(f"Error HTTP {r.status_code} al subir la foto al biométrico: {r.text or str(e)}")

    # ── Huella dactilar ───────────────────────────────────────────────────────

    @staticmethod
    def _xml_findtext(root: "ET.Element", tag: str) -> Optional[str]:
        """Busca el texto de un tag ignorando el namespace XML."""
        for el in root.iter():
            if el.tag.split("}")[-1] == tag:
                return el.text
        return None

    def capture_fingerprint(self, finger_no: int = 1, timeout: int = 40) -> dict:
        """Dispara la captura de huella en el lector del terminal.

        Es una llamada BLOQUEANTE: el equipo espera a que el empleado coloque el
        dedo (con su propio tiempo de espera). El endpoint CaptureFingerPrint de
        este firmware trabaja con XML (no JSON). Devuelve un dict con la plantilla
        codificada (`fingerData`) y la calidad. Lanza excepción si el equipo no
        detecta un dedo válido."""
        body = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            "<CaptureFingerPrintCond>"
            f"<fingerNo>{int(finger_no)}</fingerNo>"
            "</CaptureFingerPrintCond>"
        )
        r = self.session.post(
            f"{self.base_url}/AccessControl/CaptureFingerPrint",
            data=body.encode("utf-8"),
            headers={"Content-Type": "application/xml"},
            timeout=timeout,
        )

        text = r.text or ""
        finger_data = quality = status_str = sub_code = None
        try:
            root = ET.fromstring(text)
            finger_data = self._xml_findtext(root, "fingerData")
            quality = self._xml_findtext(root, "fingerPrintQuality")
            status_str = self._xml_findtext(root, "statusString")
            sub_code = self._xml_findtext(root, "subStatusCode")
        except Exception:
            # La respuesta puede venir como multipart (filePathType="multipart") con
            # el XML incrustado entre límites; extraemos los campos por regex.
            import re

            def _grab(tag):
                m = re.search(rf"<{tag}[^>]*>([^<]+)</{tag}>", text)
                return m.group(1) if m else None

            finger_data = _grab("fingerData")
            quality = _grab("fingerPrintQuality")
            status_str = _grab("statusString")
            sub_code = _grab("subStatusCode")
            if not finger_data:
                logger.error(f"No se pudo parsear la respuesta de captura de huella: {text[:400]}")

        if not finger_data:
            error_mappings = {
                "fingerprintQualityLow": "La calidad de la huella es baja. Intente de nuevo, limpio y presionando bien el dedo.",
                "lowFingerprintQuality": "La calidad de la huella es baja. Intente de nuevo, limpio y presionando bien el dedo.",
                "captureFingerprintFail": "No se pudo capturar la huella. Vuelva a intentarlo.",
                "deviceBusy": "El equipo está ocupado. Espere unos segundos e intente de nuevo.",
                "notSupport": "El equipo no soporta la captura remota de huella.",
                "captureTimeout": "Se agotó el tiempo de espera. No se detectó ningún dedo en el lector.",
            }
            msg = error_mappings.get(sub_code) or status_str or "No se detectó ninguna huella."
            raise Exception(f"El terminal no capturó la huella: {msg} (código: {sub_code or 'N/A'})")

        try:
            quality = int(quality) if quality is not None else None
        except (TypeError, ValueError):
            pass

        return {"fingerNo": finger_no, "fingerData": finger_data.strip(), "quality": quality}

    def set_fingerprint(self, user_id: str, finger_id: int, finger_data: str) -> dict:
        """Guarda una plantilla de huella asociada a un empleado en el terminal.

        El guardado se hace con POST a FingerPrintDownload (el objeto de datos es
        `FingerPrintCfg`). En este firmware `PUT FingerPrintCfg` no está soportado."""
        payload = {
            "FingerPrintCfg": {
                "employeeNo": str(user_id),
                "enableCardReader": [1],
                "fingerPrintID": int(finger_id),
                "fingerType": "normalFP",
                "fingerData": finger_data,
            }
        }
        r = self.session.post(
            f"{self.base_url}/AccessControl/FingerPrintDownload?format=json",
            json=payload,
            timeout=self.timeout,
        )
        try:
            data = r.json()
        except Exception:
            data = {}

        status_code = data.get("statusCode")
        ok = (r.status_code < 400) and (status_code is None or status_code == 1)
        if not ok:
            sub = data.get("subStatusCode")
            msg = data.get("errorMsg") or data.get("statusString") or (r.text or "")[:300]
            logger.error(f"FingerPrintDownload rechazado ({r.status_code}) para {user_id}: {r.text[:400]}")
            raise Exception(f"El equipo rechazó guardar la huella: {msg} (código: {sub or r.status_code})")
        return data

    def delete_fingerprint(self, user_id: str, finger_id: Optional[int] = None) -> dict:
        """Elimina la(s) huella(s) de un empleado en el terminal.

        Si se indica finger_id, borra solo esa; si no, borra todas las del empleado.
        Endpoint: PUT FingerPrint/Delete con el objeto EmployeeNoDetail."""
        detail: dict = {"employeeNo": str(user_id)}
        if finger_id is not None:
            detail["enableCardReader"] = [1]
            detail["fingerPrintID"] = int(finger_id)
        payload = {"FingerPrintDelete": {"mode": "byEmployeeNo", "EmployeeNoDetail": detail}}

        r = self.session.put(
            f"{self.base_url}/AccessControl/FingerPrint/Delete?format=json",
            json=payload,
            timeout=self.timeout,
        )
        try:
            data = r.json()
        except Exception:
            data = {}

        status_code = data.get("statusCode")
        ok = (r.status_code < 400) and (status_code is None or status_code == 1)
        if not ok:
            sub = data.get("subStatusCode")
            msg = data.get("errorMsg") or data.get("statusString") or (r.text or "")[:300]
            logger.error(f"FingerPrint/Delete rechazado ({r.status_code}) para {user_id}: {r.text[:400]}")
            raise Exception(f"El equipo rechazó eliminar la huella: {msg} (código: {sub or r.status_code})")
        return data

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
                r = self.session.post(
                    f"{self.base_url}/AccessControl/AcsEvent?format=json",
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
        r = self.session.get(
            f"{self.base_url}/AccessControl/capabilities",
            timeout=self.timeout,
        )
        r.raise_for_status()
        return r.json()

    # ── Control Remoto ────────────────────────────────────────────────────────
    
    def reboot_device(self) -> dict:
        r = self.session.put(
            f"{self.base_url}/System/reboot",
            timeout=self.timeout,
        )
        r.raise_for_status()
        try:
            return r.json()
        except Exception:
            return {"status": "success", "message": "Reboot command sent"}

    def open_door(self, door_no: int = 1) -> dict:
        xml_payload = f"""<?xml version="1.0" encoding="UTF-8"?>
<RemoteControlDoor version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">
    <cmd>open</cmd>
</RemoteControlDoor>"""
        headers = {"Content-Type": "application/xml"}
        r = self.session.put(
            f"{self.base_url}/AccessControl/RemoteControl/door/{door_no}",
            data=xml_payload,
            headers=headers,
            timeout=self.timeout,
        )
        r.raise_for_status()
        try:
            import xml.etree.ElementTree as ET
            root = ET.fromstring(r.content)
            status_code = 1
            status_string = "OK"
            sub_status_code = "ok"
            for child in root:
                tag = child.tag.split('}')[-1]
                if tag == "statusCode":
                    status_code = int(child.text)
                elif tag == "statusString":
                    status_string = child.text
                elif tag == "subStatusCode":
                    sub_status_code = child.text
            return {
                "statusCode": status_code,
                "statusString": status_string,
                "subStatusCode": sub_status_code
            }
        except Exception:
            return {"statusCode": 1, "statusString": "OK", "subStatusCode": "ok"}

    def close_door(self, door_no: int = 1) -> dict:
        xml_payload = f"""<?xml version="1.0" encoding="UTF-8"?>
<RemoteControlDoor version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">
    <cmd>close</cmd>
</RemoteControlDoor>"""
        headers = {"Content-Type": "application/xml"}
        r = self.session.put(
            f"{self.base_url}/AccessControl/RemoteControl/door/{door_no}",
            data=xml_payload,
            headers=headers,
            timeout=self.timeout,
        )
        r.raise_for_status()
        try:
            import xml.etree.ElementTree as ET
            root = ET.fromstring(r.content)
            status_code = 1
            status_string = "OK"
            sub_status_code = "ok"
            for child in root:
                tag = child.tag.split('}')[-1]
                if tag == "statusCode":
                    status_code = int(child.text)
                elif tag == "statusString":
                    status_string = child.text
                elif tag == "subStatusCode":
                    sub_status_code = child.text
            return {
                "statusCode": status_code,
                "statusString": status_string,
                "subStatusCode": sub_status_code
            }
        except Exception:
            return {"statusCode": 1, "statusString": "OK", "subStatusCode": "ok"}

    def set_verify_mode(self, mode: str) -> dict:
        # Mapeo de valores del frontend a valores soportados por el biométrico
        mapping = {
            "faceOnly": "face",
            "faceAndCard": "faceAndCard",
            "faceOrCard": "cardOrFace",
            "faceOrFp": "faceOrFp"
        }
        device_mode = mapping.get(mode, mode)
        
        # 1. Obtener la configuración actual del lector
        r_get = self.session.get(
            f"{self.base_url}/AccessControl/CardReaderCfg/1?format=json",
            timeout=self.timeout
        )
        r_get.raise_for_status()
        config_data = r_get.json()
        
        # 2. Modificar el modo de verificación por defecto
        config_data["CardReaderCfg"]["defaultVerifyMode"] = device_mode
        
        # 3. Guardar la configuración completa de vuelta
        r_put = self.session.put(
            f"{self.base_url}/AccessControl/CardReaderCfg/1?format=json",
            json=config_data,
            timeout=self.timeout
        )
        r_put.raise_for_status()
        return r_put.json()
        
    def sync_time(self) -> dict:
        """Sincroniza la hora del dispositivo con la del servidor."""
        now = datetime.now()
        # Formato ISO8601 exigido por ISAPI: YYYY-MM-DDThh:mm:ss+ZZ:ZZ
        time_str = now.isoformat(timespec='seconds')
        payload = {
            "Time": {
                "localTime": time_str,
                "timeZone": "CST-5" # Ejemplo, dependerá del timezone real si se quiere afinar
            }
        }
        try:
            # Primero intentar JSON
            r = self.session.put(
                f"{self.base_url}/System/time?format=json",
                json=payload,
                timeout=self.timeout,
            )
            r.raise_for_status()
            return r.json()
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 400:
                # Fallback XML si el dispositivo no soporta JSON en este endpoint
                xml_payload = f"""<?xml version="1.0" encoding="UTF-8"?>
<Time>
    <localTime>{time_str}</localTime>
</Time>"""
                r = self.session.put(
                    f"{self.base_url}/System/time",
                    data=xml_payload,
                    timeout=self.timeout,
                )
                r.raise_for_status()
                return {"status": "success", "message": "Time synced via XML"}
            raise e

    def get_verify_mode(self) -> str:
        """Obtiene el modo de verificación configurado por defecto en el lector."""
        r = self.session.get(
            f"{self.base_url}/AccessControl/CardReaderCfg/1?format=json",
            timeout=self.timeout
        )
        r.raise_for_status()
        config_data = r.json()
        device_mode = config_data.get("CardReaderCfg", {}).get("defaultVerifyMode")
        
        # Mapeo reverso
        reverse_mapping = {
            "face": "faceOnly",
            "faceAndCard": "faceAndCard",
            "cardOrFace": "faceOrCard",
            "faceOrFp": "faceOrFp"
        }
        return reverse_mapping.get(device_mode, "faceOrCard")

    def get_voice_prompt(self) -> bool:
        """Obtiene el estado de la configuración de avisos de voz."""
        r = self.session.get(
            f"{self.base_url}/AccessControl/AcsCfg?format=json",
            timeout=self.timeout
        )
        r.raise_for_status()
        config_data = r.json()
        return config_data.get("AcsCfg", {}).get("voicePrompt", True)

    def set_voice_prompt(self, enabled: bool) -> dict:
        """Establece si están activos los avisos de voz."""
        r_get = self.session.get(
            f"{self.base_url}/AccessControl/AcsCfg?format=json",
            timeout=self.timeout
        )
        r_get.raise_for_status()
        config_data = r_get.json()
        
        config_data["AcsCfg"]["voicePrompt"] = enabled
        
        r_put = self.session.put(
            f"{self.base_url}/AccessControl/AcsCfg?format=json",
            json=config_data,
            timeout=self.timeout
        )
        r_put.raise_for_status()
        return r_put.json()
