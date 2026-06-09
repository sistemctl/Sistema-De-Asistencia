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
from backend.services.scheduler import _scheduler, configure_scheduler_jobs, start_scheduler, stop_scheduler

def test_scheduler_rescheduling():
    print("🧪 Iniciando prueba de diagnóstico para la REPROGRAMACIÓN dinámica de tareas...")
    
    # Iniciar el scheduler
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
        orig_absences_time = getattr(sys_config, "absences_check_time", "11:00")
        orig_report_time = getattr(sys_config, "daily_report_time", "19:00")
        orig_cleanup_time = getattr(sys_config, "cleanup_time", "02:00")
        orig_sync_interval = dev_config.sync_interval_minutes

        print(f"🔄 Configuración de tiempos inicial:")
        print(f"  - Hora Ausencias Inicial: {orig_absences_time}")
        print(f"  - Hora Reporte Diario Inicial: {orig_report_time}")
        print(f"  - Hora Limpieza Inicial: {orig_cleanup_time}")
        print(f"  - Intervalo Sync Inicial: {orig_sync_interval} minutos")

        # --- PRUEBA 1: Cambiar horarios ---
        print("\n⚙️ Cambiando horarios de tareas en la base de datos...")
        sys_config.absences_check_time = "08:30"
        sys_config.daily_report_time = "17:15"
        sys_config.cleanup_time = "04:45"
        sys_config.email_notifications_enabled = True
        sys_config.alert_admin_daily_report = True
        sys_config.email_alerts_recipients = "admin@test.com"
        sys_config.cleanup_enabled = True
        dev_config.sync_interval_minutes = 15
        db.commit()

        print("🔌 Ejecutando configure_scheduler_jobs...")
        configure_scheduler_jobs(db)

        # Obtener los trabajos del scheduler
        job_absences = _scheduler.get_job("check_daily_absences")
        job_report = _scheduler.get_job("send_daily_report")
        job_cleanup = _scheduler.get_job("run_daily_cleanup")

        # Verificar nuevos triggers
        if job_absences:
            trigger = job_absences.trigger
            # En APScheduler, los fields del cron trigger se pueden inspeccionar
            fields = {f.name: f for f in trigger.fields}
            print(f"  - check_daily_absences reprogramado a: {fields['hour'].expressions[0]}:{fields['minute'].expressions[0]}")
            assert str(fields['hour'].expressions[0]) == "8", "La hora de ausencias debería ser 8"
            assert str(fields['minute'].expressions[0]) == "30", "El minuto de ausencias debería ser 30"
        
        if job_report:
            trigger = job_report.trigger
            fields = {f.name: f for f in trigger.fields}
            print(f"  - send_daily_report reprogramado a: {fields['hour'].expressions[0]}:{fields['minute'].expressions[0]}")
            assert str(fields['hour'].expressions[0]) == "17", "La hora de reporte diario debería ser 17"
            assert str(fields['minute'].expressions[0]) == "15", "El minuto de reporte diario debería ser 15"
            
        if job_cleanup:
            trigger = job_cleanup.trigger
            fields = {f.name: f for f in trigger.fields}
            print(f"  - run_daily_cleanup reprogramado a: {fields['hour'].expressions[0]}:{fields['minute'].expressions[0]}")
            assert str(fields['hour'].expressions[0]) == "4", "La hora de limpieza debería ser 4"
            assert str(fields['minute'].expressions[0]) == "45", "El minuto de limpieza debería ser 45"

        print("✅ Verificación exitosa: Todas las tareas fueron reprogramadas con las nuevas horas de la DB.")

        # Restaurar valores iniciales
        print("\n🔄 Restaurando valores iniciales...")
        sys_config.absences_check_time = orig_absences_time
        sys_config.daily_report_time = orig_report_time
        sys_config.cleanup_time = orig_cleanup_time
        dev_config.sync_interval_minutes = orig_sync_interval
        db.commit()
        configure_scheduler_jobs(db)
        
        # Detener scheduler al finalizar
        stop_scheduler()
        
        print("\n🎉 ¡Todos los diagnósticos de reprogramación pasaron correctamente!")

    except Exception as e:
        print(f"❌ Error durante la prueba de diagnóstico de reprogramación: {e}")
        try:
            stop_scheduler()
        except:
            pass
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    test_scheduler_rescheduling()
