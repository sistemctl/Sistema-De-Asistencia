import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from sqlalchemy.orm import Session
from backend.models import SystemConfig
import logging

logger = logging.getLogger("attendance_email")

def send_smtp_email(config: SystemConfig, subject: str, html_content: str, recipients: list):
    if not config.smtp_host or not config.smtp_port or not config.smtp_username or not config.smtp_password:
        raise Exception("Falta configurar los parámetros SMTP del servidor.")
    
    if not recipients:
        raise Exception("No hay destinatarios configurados para recibir alertas.")

    # Formar el mensaje
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{config.system_name} <{config.smtp_username}>"
    msg["To"] = ", ".join(recipients)

    msg.attach(MIMEText(html_content, "html", "utf-8"))

    # Conectar y enviar
    try:
        if config.smtp_use_tls:
            server = smtplib.SMTP(config.smtp_host, config.smtp_port, timeout=10)
            server.ehlo()
            server.starttls()
            server.ehlo()
        else:
            server = smtplib.SMTP_SSL(config.smtp_host, config.smtp_port, timeout=10)
            server.ehlo()

        server.login(config.smtp_username, config.smtp_password)
        server.sendmail(config.smtp_username, recipients, msg.as_string())
        server.quit()
        logger.info(f"Correo electrónico enviado con éxito a {recipients}")
    except Exception as e:
        logger.error(f"Error al enviar correo por SMTP: {e}")
        raise e

def send_test_email(config: SystemConfig, test_recipient: str):
    subject = f"Prueba de Conexión SMTP - {config.system_name}"
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; color: #1e293b;">
            <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                <h2 style="color: #4f46e5; margin-bottom: 20px;">¡Prueba SMTP Exitosa! 🚀</h2>
                <p>Este es un correo electrónico de prueba enviado desde tu <strong>{config.system_name}</strong> para verificar la configuración de alertas.</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="font-size: 0.85em; color: #64748b;">Enviado automáticamente por el Sistema de Asistencia de Personal.</p>
            </div>
        </body>
    </html>
    """
    send_smtp_email(config, subject, html_content, [test_recipient])

def notify_attendance_alert(db: Session, employee_name: str, record_time: str, status: str, details: str):
    config = db.query(SystemConfig).first()
    if not config or not config.email_notifications_enabled or not config.email_alerts_recipients:
        return

    recipients = [r.strip() for r in config.email_alerts_recipients.split(",") if r.strip()]
    if not recipients:
        return

    subject = f"⚠️ Alerta de Asistencia: {status} - {employee_name}"
    
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; color: #1e293b;">
            <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                <h2 style="color: #dc2626; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
                    ⚠️ Alerta de Incidencia
                </h2>
                <p>Se ha registrado un evento inusual en el sistema de asistencia:</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 10px 0; font-weight: bold; color: #64748b; width: 150px;">Empleado:</td>
                        <td style="padding: 10px 0; color: #0f172a; font-weight: 500;">{employee_name}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 10px 0; font-weight: bold; color: #64748b;">Incidencia:</td>
                        <td style="padding: 10px 0; color: #b91c1c; font-weight: 600;">{status}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 10px 0; font-weight: bold; color: #64748b;">Fecha/Hora:</td>
                        <td style="padding: 10px 0; color: #0f172a; font-family: monospace;">{record_time}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 10px 0; font-weight: bold; color: #64748b;">Detalles:</td>
                        <td style="padding: 10px 0; color: #334155;">{details}</td>
                    </tr>
                </table>

                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="font-size: 0.85em; color: #64748b; text-align: center;">Este es un mensaje automático de seguridad. No responda a este correo.</p>
            </div>
        </body>
    </html>
    """
    
    # Ejecutar en segundo plano para evitar colgar la marcación de asistencia
    from fastapi.concurrency import run_in_threadpool
    import asyncio
    
    async def task():
        try:
            await run_in_threadpool(send_smtp_email, config, subject, html_content, recipients)
        except Exception as err:
            logger.error(f"Fallo al enviar alerta de asistencia asíncrona: {err}")

    # Enviar el email en una tarea asíncrona
    loop = asyncio.get_event_loop()
    if loop.is_running():
        loop.create_task(task())
    else:
        asyncio.run(task())

def notify_employee_lateness(db: Session, employee_name: str, employee_email: str, record_time: str, minutes_late: float):
    config = db.query(SystemConfig).first()
    if not config or not config.email_notifications_enabled or not config.alert_employee_lateness:
        return
        
    if not employee_email:
        return

    subject = f"Aviso de Llegada Tardía - {config.system_name}"
    
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; color: #1e293b;">
            <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                <h2 style="color: #ea580c; margin-bottom: 20px;">Hola {employee_name},</h2>
                <p>El sistema ha registrado tu entrada a las <strong>{record_time}</strong>.</p>
                <p>Esto representa un aproximado de <strong>{minutes_late} minutos de retraso</strong> respecto a tu horario configurado.</p>
                <p style="margin-top: 20px; padding: 15px; background-color: #fff7ed; border-left: 4px solid #f97316;">
                    💡 <strong>Recomendación:</strong> Te sugerimos anticipar tu llegada para evitar que estas incidencias afecten tu registro de asistencia mensual.
                </p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="font-size: 0.85em; color: #64748b; text-align: center;">Este es un mensaje automático generado por {config.system_name}.</p>
            </div>
        </body>
    </html>
    """
    
    from fastapi.concurrency import run_in_threadpool
    import asyncio
    
    async def task():
        try:
            await run_in_threadpool(send_smtp_email, config, subject, html_content, [employee_email.strip()])
        except Exception as err:
            logger.error(f"Fallo al enviar correo a empleado {{employee_email}}: {{err}}")

    loop = asyncio.get_event_loop()
    if loop.is_running():
        loop.create_task(task())
    else:
        asyncio.run(task())

def notify_daily_report(db: Session, target_date: str, summaries: list):
    config = db.query(SystemConfig).first()
    if not config or not config.email_notifications_enabled or not config.alert_admin_daily_report or not config.email_alerts_recipients:
        return

    recipients = [r.strip() for r in config.email_alerts_recipients.split(",") if r.strip()]
    if not recipients:
        return

    subject = f"📊 Reporte Diario de Asistencia - {target_date}"
    
    # Construir tabla
    rows = ""
    for s in summaries:
        emp_name = s.get("employee_name", "")
        is_present = s.get("is_present", False)
        is_late = s.get("is_late", False)
        is_off = s.get("is_off", False)
        
        status_badge = ""
        if is_off:
            status_badge = '<span style="color: #64748b;">Día Libre/Feriado</span>'
        elif not is_present:
            status_badge = '<span style="color: #dc2626; font-weight: bold;">Ausente</span>'
        elif is_late:
            status_badge = '<span style="color: #ea580c; font-weight: bold;">Tarde</span>'
        else:
            status_badge = '<span style="color: #16a34a;">A Tiempo</span>'
            
        entry_time = s.get("punches", {}).get("entry_1") or "-"
        if entry_time != "-":
            entry_time = entry_time.split("T")[-1][:8]
            
        rows += f"""
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px;">{emp_name}</td>
            <td style="padding: 10px;">{status_badge}</td>
            <td style="padding: 10px;">{entry_time}</td>
        </tr>
        """
        
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; color: #1e293b;">
            <div style="max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0;">
                <h2 style="color: #4f46e5; margin-bottom: 10px;">Reporte Diario de Asistencia</h2>
                <p style="color: #64748b; margin-bottom: 20px;">Resumen correspondiente al día: <strong>{target_date}</strong></p>
                
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <thead>
                        <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                            <th style="padding: 10px;">Empleado</th>
                            <th style="padding: 10px;">Estado</th>
                            <th style="padding: 10px;">Hora Entrada</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows}
                    </tbody>
                </table>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0 20px 0;" />
                <p style="font-size: 0.85em; color: #64748b; text-align: center;">Este reporte fue generado automáticamente por {config.system_name}.</p>
            </div>
        </body>
    </html>
    """
    
    from fastapi.concurrency import run_in_threadpool
    import asyncio
    
    async def task():
        try:
            await run_in_threadpool(send_smtp_email, config, subject, html_content, recipients)
        except Exception as err:
            logger.error(f"Fallo al enviar reporte diario: {{err}}")

    loop = asyncio.get_event_loop()
    if loop.is_running():
        loop.create_task(task())
    else:
        asyncio.run(task())
