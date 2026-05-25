from backend.database import SessionLocal
from backend.models import Employee, DeviceConfig

def check_prueba():
    db = SessionLocal()
    try:
        emp = db.query(Employee).filter(Employee.first_name.ilike("%prueba%") | Employee.last_name.ilike("%prueba%")).first()
        if emp:
            print(f"Empleado encontrado:")
            print(f"  ID: {emp.id}")
            print(f"  Nombre: {emp.first_name} {emp.last_name}")
            print(f"  Código: {emp.employee_code}")
            print(f"  Device User ID: {emp.device_user_id}")
            print(f"  Synced to device: {emp.synced_to_device}")
        else:
            print("No se encontro ningun empleado con el nombre 'prueba'.")
            
        cfg = db.query(DeviceConfig).first()
        if cfg:
            print("Configuracion de dispositivo:")
            print(f"  IP: {cfg.ip_address}")
            print(f"  Port: {cfg.port}")
            print(f"  Username: {cfg.username}")
            print(f"  Is Online: {cfg.is_online}")
    except Exception as e:
        print(f"Error querying database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_prueba()
