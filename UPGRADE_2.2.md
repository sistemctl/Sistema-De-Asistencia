# Guía de Actualización a la Versión 2.2 🚀

Esta guía contiene los pasos necesarios para actualizar el **Sistema de Asistencia** a la **versión 2.2** en el entorno de producción.

---

## 📋 Resumen de Cambios en la v2.2
- **Justificación Individual de Faltas/Retardos:** Funcionalidad para justificar directamente inasistencias o retrasos desde la tabla de asistencia. Estos registros pasan a estado "Justificado" en los reportes (Excel y PDF).
- **Gestión Avanzada de Feriados y Permisos:** Nuevos módulos para registrar días festivos (`holidays`) y permisos temporales/licencias por empleado (`leaves`), evitando que el sistema los califique como inasistencia.
- **Dashboard Interactivo y Analítica de KPIs:** Nuevos KPIs dinámicos y widgets avanzados, incluyendo una vista del mejor empleado (Podio) y soporte ampliado para reportes de desempeño de los empleados.
- **Evolución del Panel de Administración y Configuración:** Se agregaron permisos granulares, alertas y notificaciones proactivas de discrepancias (e.g. empleado sin horario).
- **Historial de Auditoría Completo:** Módulo de auditoría que registra todas las creaciones, actualizaciones y eliminaciones de empleados (individuales y en lote), departamentos, cargos, y descargas de copias de seguridad de forma segura y transparente.
- **Configuración de Servidor de Correo SMTP:** Permite configurar un servidor de correo saliente para el envío de notificaciones automáticas y reportes periódicos.
- **Copias de Seguridad Todo en Uno (.zip):** Nuevo sistema de copias de seguridad y restauración que empaqueta tanto los volcados SQL de la base de datos como las fotos de perfil de los empleados y recursos multimedia en un solo archivo comprimido `.zip` con barra de progreso.

---

## 🛠️ Pasos para Actualizar en Producción

### Paso 1: Obtener el Código de la Rama `2.2`
En el servidor de producción, navega al directorio del proyecto y cambia a la rama `2.2`:

```bash
# Obtener los últimos cambios
git fetch origin

# Cambiar a la rama 2.2 y actualizar
git checkout 2.2
git pull origin 2.2
```

---

### Paso 2: Actualizar Dependencias
La versión 2.2 puede incluir nuevas librerías en `requirements.txt`. Asegúrate de instalarlas:

```bash
# Activar entorno virtual (Linux)
source venv/bin/activate
# En Windows: venv\Scripts\activate

# Instalar dependencias nuevas
pip install -r requirements.txt
```

---

### Paso 3: Aplicar Migraciones de Base de Datos
La versión 2.2 trae nuevas tablas de base de datos (`holidays`, `leaves`, `attendance_justifications`, `audit_logs`, etc.). Ejecuta los siguientes scripts en orden para actualizar la estructura de la base de datos de manera segura sin perder información.

```bash
# Estando dentro del entorno virtual, ejecuta las migraciones base:
python migrations/migration_user_permissions.py
python migrations/migration_additional_permissions.py
python migrations/migration_holidays.py
python migrations/migration_leaves.py

# Ejecuta las migraciones de auditoría y configuración SMTP:
python scripts/migration_audit.py
python scripts/migration_smtp.py
```

---

### Paso 4: Reiniciar el Backend (Python/FastAPI)
Para aplicar los cambios en las rutas, modelos y lógicas del servidor:
- **Si usas Windows (start.bat o script de inicio):** Cierra la consola actual del backend y vuelve a ejecutar `start.bat`.
- **Si usas Linux (systemd):**
  ```bash
  sudo systemctl restart asistencia.service
  ```
- **Si usas PM2:**
  ```bash
  pm2 restart asistencia-backend
  ```

---

### Paso 5: Limpieza de Caché del Cliente (Frontend)
Debido a los importantes cambios y la nueva versión `v=11` del frontend:
1. **Forzar recarga en el navegador:** Pide a los usuarios que abran la aplicación y presionen **Ctrl + F5** (o **Cmd + Shift + R** en Mac) para evitar problemas visuales por caché antigua.
2. **Si usas Nginx para servir el frontend:** Asegúrate de recargar Nginx:
   ```bash
   sudo systemctl reload nginx
   ```

¡La actualización a la versión 2.2 estará completada y lista para usarse!
