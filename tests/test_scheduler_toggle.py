import sys
import os
from pathlib import Path
import logging

# Configurar PYTHONPATH
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Configurar logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

from backend.database import SessionLocal
from backend.models import SystemConfig, DeviceConfig
from backend.services.scheduler import _scheduler, configure_scheduler_jobs

def test_scheduler_toggles():
    print("🧪 Iniciando prueba de diagnóstico para la activación/desactivación dinámica de tareas...")
    
    # Iniciar el scheduler para registrar los trabajos
    from backend.services.scheduler import start_scheduler, stop_scheduler
    start_scheduler()
    
    db = SessionLocal()
    try:
        # 1. Obtener la configuración actual
        sys_config = db.query(SystemConfig).first()
        dev_config = db.query(DeviceConfig).first()
        
        if not sys_config:
            print("❌ No se encontró la configuración del sistema (SystemConfig).")
            sys.exit(1)
        if not dev_config:
            print("❌ No se encontró la configuración del dispositivo (DeviceConfig).")
            sys.exit(1)

        # Respaldar valores iniciales
        orig_sys_email = sys_config.email_notifications_enabled
        orig_sys_report = sys_config.alert_admin_daily_report
        orig_sys_cleanup = sys_config.cleanup_enabled
        orig_dev_sync = getattr(dev_config, "automatic_sync_enabled", True)

        print(f"🔄 Configuración inicial:")
        print(f"  - Correo Maestro Habilitado: {orig_sys_email}")
        print(f"  - Reporte Diario Habilitado: {orig_sys_report}")
        print(f"  - Limpieza Automática Habilitada: {orig_sys_cleanup}")
        print(f"  - Sync Automático Habilitado: {orig_dev_sync}")

        # --- PRUEBA 1: Desactivar todo ---
        print("\n⚙️ Desactivando todas las tareas en la base de datos...")
        sys_config.email_notifications_enabled = False
        sys_config.cleanup_enabled = False
        dev_config.automatic_sync_enabled = False
        db.commit()

        print("🔌 Ejecutando configure_scheduler_jobs...")
        configure_scheduler_jobs(db)

        # Verificar estados en el scheduler
        job_sync = _scheduler.get_job("sync_hikvision")
        job_report = _scheduler.get_job("send_daily_report")
        job_absences = _scheduler.get_job("check_daily_absences")
        job_cleanup = _scheduler.get_job("run_daily_cleanup")

        # Nota: En APScheduler, un trabajo pausado tiene next_run_time = None
        if job_sync:
            print(f"  - Estado sync_hikvision next_run_time: {job_sync.next_run_time}")
            assert job_sync.next_run_time is None, "sync_hikvision debería estar pausado"
        if job_report:
            print(f"  - Estado send_daily_report next_run_time: {job_report.next_run_time}")
            assert job_report.next_run_time is None, "send_daily_report debería estar pausado"
        if job_absences:
            print(f"  - Estado check_daily_absences next_run_time: {job_absences.next_run_time}")
            assert job_absences.next_run_time is None, "check_daily_absences debería estar pausado"
        if job_cleanup:
            print(f"  - Estado run_daily_cleanup next_run_time: {job_cleanup.next_run_time}")
            assert job_cleanup.next_run_time is None, "run_daily_cleanup debería estar pausado"
        
        print("✅ Verificación exitosa: Todas las tareas fueron pausadas correctamente.")

        # --- PRUEBA 2: Activar todo ---
        print("\n⚙️ Activando todas las tareas en la base de datos...")
        sys_config.email_notifications_enabled = True
        sys_config.alert_admin_daily_report = True
        sys_config.cleanup_enabled = True
        dev_config.automatic_sync_enabled = True
        db.commit()

        print("🔌 Ejecutando configure_scheduler_jobs...")
        configure_scheduler_jobs(db)

        job_sync = _scheduler.get_job("sync_hikvision")
        job_report = _scheduler.get_job("send_daily_report")
        job_absences = _scheduler.get_job("check_daily_absences")
        job_cleanup = _scheduler.get_job("run_daily_cleanup")

        if job_sync:
            print(f"  - Estado sync_hikvision next_run_time: {job_sync.next_run_time}")
            assert job_sync.next_run_time is not None, "sync_hikvision debería estar activo"
        if job_report:
            print(f"  - Estado send_daily_report next_run_time: {job_report.next_run_time}")
            assert job_report.next_run_time is not None, "send_daily_report debería estar activo"
        if job_absences:
            print(f"  - Estado check_daily_absences next_run_time: {job_absences.next_run_time}")
            assert job_absences.next_run_time is not None, "check_daily_absences debería estar activo"
        if job_cleanup:
            print(f"  - Estado run_daily_cleanup next_run_time: {job_cleanup.next_run_time}")
            assert job_cleanup.next_run_time is not None, "run_daily_cleanup debería estar activo"

        print("✅ Verificación exitosa: Todas las tareas fueron reactivadas correctamente.")

        # Restaurar valores iniciales
        sys_config.email_notifications_enabled = orig_sys_email
        sys_config.alert_admin_daily_report = orig_sys_report
        sys_config.cleanup_enabled = orig_sys_cleanup
        dev_config.automatic_sync_enabled = orig_dev_sync
        db.commit()
        configure_scheduler_jobs(db)
        
        # Detener scheduler al finalizar
        stop_scheduler()
        
        print("\n🎉 ¡Todos los diagnósticos del scheduler pasaron correctamente!")

    except Exception as e:
        print(f"❌ Error durante la prueba de diagnóstico del scheduler: {e}")
        try:
            stop_scheduler()
        except:
            pass
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    test_scheduler_toggles()
