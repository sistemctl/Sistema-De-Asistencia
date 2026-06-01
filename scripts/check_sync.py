import sys
from backend.database import SessionLocal
from backend.models import DeviceConfig, SyncLog, Employee, AttendanceRecord

db = SessionLocal()

print("=== CONFIGURACIÓN DEL DISPOSITIVO ===")
cfg = db.query(DeviceConfig).first()
if cfg:
    print(f"IP: {cfg.ip_address}")
    print(f"Puerto: {cfg.port}")
    print(f"Usuario: {cfg.username}")
    print(f"Contraseña: {cfg.password}")
    print(f"¿Online en BD?: {cfg.is_online}")
    print(f"Última comprobación: {cfg.last_check}")
    print(f"Última sincronización exitosa: {cfg.last_successful_sync}")
    print(f"Total eventos sinc: {cfg.total_events_synced}")
else:
    print("No se encontró configuración de dispositivo en la base de datos.")

print("\n=== ÚLTIMOS 10 REGISTROS DE SINCRONIZACIÓN (SYNC LOGS) ===")
logs = db.query(SyncLog).order_by(SyncLog.id.desc()).limit(10).all()
for log in logs:
    print(f"ID: {log.id} | Inicio: {log.started_at} | Fin: {log.finished_at} | Estado: {log.status} | Traídos: {log.events_fetched} | Nuevos: {log.events_new} | Mock: {log.is_mock}")
    if log.error_message:
        print(f"  Error: {log.error_message}")

print("\n=== TOTAL DE EMPLEADOS Y ASISTENCIAS ===")
emp_count = db.query(Employee).count()
att_count = db.query(AttendanceRecord).count()
print(f"Empleados en BD: {emp_count}")
print(f"Registros de asistencia en BD: {att_count}")

# Probar conexión real si es posible
if cfg:
    print("\n=== PROBANDO CONEXIÓN DIRECTA CON EL DISPOSITIVO ===")
    from backend.services.hikvision import HikvisionClient
    try:
        client = HikvisionClient(cfg.ip_address, cfg.port, cfg.username, cfg.password)
        online = client.check_online()
        print(f"Resultado de check_online(): {online}")
        if online:
            info = client.get_device_info()
            print(f"Información del dispositivo: {info}")
    except Exception as e:
        print(f"Error al intentar conectar: {e}")

db.close()
