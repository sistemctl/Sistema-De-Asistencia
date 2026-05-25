import sys
import os
import requests
from requests.auth import HTTPDigestAuth

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.database import SessionLocal
from backend.models import Employee, DeviceConfig

def test_payloads():
    db = SessionLocal()
    try:
        emp = db.query(Employee).filter(Employee.id == 260).first()
        cfg = db.query(DeviceConfig).first()
        if not emp or not cfg:
            print("Faltan datos de prueba.")
            return

        base_url = f"http://{cfg.ip_address}:{cfg.port}/ISAPI"
        auth = HTTPDigestAuth(cfg.username, cfg.password)
        
        user_info = {
            "employeeNo": "123456",
            "name": "prueba",
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

        # Prueba 1: UserInfo como Objeto
        print("\n--- PRUEBA 1: UserInfo como Objeto ---")
        payload_obj = {"UserInfo": user_info}
        try:
            r = requests.post(
                f"{base_url}/AccessControl/UserInfo/Record?format=json",
                auth=auth,
                json=payload_obj,
                timeout=10,
            )
            print(f"Status Code: {r.status_code}")
            print(f"Response: {r.text}")
        except Exception as e:
            print(f"Error: {e}")

        # Prueba 2: UserInfo como Lista (como esta actualmente)
        print("\n--- PRUEBA 2: UserInfo como Lista ---")
        payload_list = {"UserInfo": [user_info]}
        try:
            r = requests.post(
                f"{base_url}/AccessControl/UserInfo/Record?format=json",
                auth=auth,
                json=payload_list,
                timeout=10,
            )
            print(f"Status Code: {r.status_code}")
            print(f"Response: {r.text}")
        except Exception as e:
            print(f"Error: {e}")

    finally:
        db.close()

if __name__ == "__main__":
    test_payloads()
