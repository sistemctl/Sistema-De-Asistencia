import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.database import SessionLocal
from backend.models import Employee, DeviceConfig
from backend.services.hikvision import HikvisionClient

def test_sync():
    db = SessionLocal()
    try:
        emp = db.query(Employee).filter(Employee.id == 260).first()
        if not emp:
            print("No se encontro al empleado con ID 260.")
            return

        cfg = db.query(DeviceConfig).first()
        if not cfg:
            print("No hay configuracion de dispositivo.")
            return

        print(f"Intentando conectar al biométrico en {cfg.ip_address}:{cfg.port}...")
        client = HikvisionClient(cfg.ip_address, cfg.port, cfg.username, cfg.password)
        
        online = client.check_online()
        print(f"Biométrico online: {online}")
        if not online:
            return

        print(f"Enviando usuario a biométrico:")
        test_code = "12345"
        print(f"  EmployeeNo: {test_code}")
        print(f"  Name: {emp.full_name}")
        print(f"  Card: {emp.card_number}")
        
        try:
            res = client.create_user(test_code, emp.full_name.strip(), emp.card_number)

            print(f"Respuesta del biométrico: {res}")
            
            # Si tiene exito, actualizamos en DB
            emp.device_user_id = emp.employee_code
            emp.synced_to_device = True
            db.commit()
            print("Sincronizacion exitosa en la DB local!")
        except Exception as e:
            print(f"Fallo la llamada ISAPI al biométrico: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"Status Code: {e.response.status_code}")
                print(f"Response Body: {e.response.text}")
    finally:
        db.close()

if __name__ == "__main__":
    test_sync()
