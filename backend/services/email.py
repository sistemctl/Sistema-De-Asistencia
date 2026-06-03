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
