import sys
import os
from pathlib import Path
from datetime import date

# Configurar PYTHONPATH para que reconozca el módulo backend
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

import logging

# Configurar logging para el test
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

from backend.database import SessionLocal
from backend.models import SystemConfig
from backend.services.attendance_processor import process_daily_attendance_bulk
from backend.services.email import notify_daily_report

def test_daily_report_generation():
    print("🧪 Iniciando prueba de diagnóstico para el Reporte Diario de Correo...")
    db = SessionLocal()
    try:
        # 1. Obtener configuración
        config = db.query(SystemConfig).first()
        if not config:
            print("❌ No se encontró la configuración del sistema (SystemConfig).")
            sys.exit(1)
            
        print(f"✅ Configuración del sistema encontrada. Nombre del sistema: '{config.system_name}'")
        
        # 2. Validar si las notificaciones de correo están habilitadas
        print(f"📢 Correo Maestro Habilitado: {config.email_notifications_enabled}")
        print(f"📢 Alerta de Reporte Diario Habilitado: {config.alert_admin_daily_report}")
        print(f"📢 Destinatarios de Alertas: '{config.email_alerts_recipients}'")
        
        if not config.email_notifications_enabled:
            print("⚠️ Advertencia: Las notificaciones por correo electrónico están desactivadas globalmente en la configuración.")
        if not config.alert_admin_daily_report:
            print("⚠️ Advertencia: El envío de reportes diarios a administradores está desactivado.")
        if not config.email_alerts_recipients:
            print("⚠️ Advertencia: No hay destinatarios configurados en 'email_alerts_recipients'.")

        # 3. Generar resúmenes de asistencia para hoy
        today = date.today()
        print(f"📊 Generando resúmenes de asistencia en bulk para la fecha: {today}")
        summaries = process_daily_attendance_bulk(db, target_date=today)
        print(f"✅ Se procesaron {len(summaries)} registros de asistencia para hoy.")
        
        # 4. Intentar enviar o simular el envío
        print("📨 Intentando ejecutar notify_daily_report...")
        # Llama a la función. Si SMTP está configurado, intentará enviar el correo en segundo plano
        notify_daily_report(db, str(today), summaries)
        
        print("🎉 ¡Proceso de prueba del reporte diario finalizado! (Comprueba los logs y el servidor SMTP para confirmar la entrega).")
        
    except Exception as e:
        print(f"❌ Error durante la prueba de reporte diario: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    test_daily_report_generation()
