# Plan de Mejoras Futuras: Sistema de Asistencia Premium

Este documento recopila las propuestas de expansión y optimización técnica para el software de asistencia Hikvision, diseñadas para transformar la plataforma en una herramienta de nivel empresarial con altos estándares de seguridad y control de personal.

---

## 1. Módulo de Vacaciones y Permisos (Justificaciones)
* **Objetivo:** Permitir al Gestor de RRHH registrar inasistencias autorizadas para evitar que penalicen la métrica del empleado.
* **Problema que resuelve:** Actualmente, si un trabajador no marca asistencia, el sistema lo clasifica como "Ausente". Esto distorsiona la tasa de asistencia mensual si la persona estaba enferma o de vacaciones.
* **Detalles de Implementación:**
  * **Base de Datos:** Crear la tabla `leave_records` (id, employee_id, start_date, end_date, leave_type [vacaciones|medico|personal], reason, created_by).
  * **Cálculo de KPIs:** Modificar el motor de estadísticas de asistencia para comprobar si una inasistencia en una fecha determinada coincide con un registro en `leave_records`. Si es así, se marcará en los reportes como **"Justificado"** o **"Vacaciones"** y no se restará de la tasa de asistencia.
  * **UI:** Añadir un formulario modal simple en la sección de empleados para asignar un rango de fechas de justificación.

---

## 2. Registro de Auditoría de Acciones (Audit Logs)
* **Objetivo:** Proporcionar al Super Administrador visibilidad total y trazabilidad de las acciones realizadas por los administradores de la plataforma.
* **Problema que resuelve:** Con la introducción de roles como *Gestor de RRHH*, múltiples personas pueden interactuar con los datos. Si un empleado es borrado accidentalmente o la configuración de red cambia, es crucial saber quién causó la modificación.
* **Detalles de Implementación:**
  * **Base de Datos:** Crear la tabla `audit_logs` (id, user_id, action, target_table, details, ip_address, timestamp).
  * **Backend Middleware:** Implementar un decorador o interceptor en FastAPI que registre automáticamente los métodos de escritura (`POST`, `PUT`, `DELETE`) en la base de datos indicando qué usuario los originó.
  * **UI:** Pestaña oculta visible únicamente para el rol `admin` (Super Admin) que lista en orden cronológico inverso las acciones del sistema con tipografía monoespaciada para timestamps.

---

## 3. Integración de Alertas vía Webhooks
* **Objetivo:** Enviar notificaciones automáticas a canales externos (Slack, Microsoft Teams, Webhook personalizado) cuando ocurran eventos críticos.
* **Problema que resuelve:** Permite a los administradores estar al tanto de los problemas sin tener que abrir la aplicación.
* **Detalles de Implementación:**
  * **Configuración:** Crear un panel de configuración de Webhooks donde el usuario pueda pegar la URL de destino.
  * **Disparadores (Triggers):** Implementar lógica para disparar eventos ante: desconexión de dispositivos, detección de intentos de acceso no autorizados o cuando un empleado supere un límite de ausencias.

---

## 4. Campanita de Notificaciones Web (Tiempo Real)
* **Objetivo:** Informar activamente a los administradores de incidentes de conectividad o de asistencia crítica directamente en la barra superior.
* **Problema que resuelve:** En la actualidad, el administrador debe ir manualmente a las secciones de depuración para verificar la conexión del biométrico Hikvision o fallas de importación.
* **Detalles de Implementación:**
  * **Notificación de Red:** Si el biométrico entra en desconexión física de la red local, el servicio programado (Scheduler) enviará una alerta.
  * **UI:** Añadir una campanilla animada con micro-interacciones (CSS pulsante) en el header de la aplicación. Al hacer clic, desplegará un menú Glassmorphism con un listado de eventos recientes (ej. *"Conexión perdida con el biométrico en 192.168.4.137"*, *"Sincronización histórica completada con éxito"*).
