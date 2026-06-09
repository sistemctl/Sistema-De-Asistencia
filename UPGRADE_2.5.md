# Guía de Actualización a la Versión 2.5 🚀

Esta guía contiene los pasos necesarios para actualizar el **Sistema de Asistencia** a la **versión 2.5** en el entorno de producción.

---

## 📋 Resumen de Cambios en la v2.5
- **Rediseño del Módulo de Dispositivos:** Reestructuración de la interfaz en pestañas (Red y Conexión, Control Remoto, Ajustes de Seguridad e Historial de Sincronización) para evitar la sobrecarga visual. Opciones redundantes como reglas de asistencia y sincronización periódica fueron movidas a la sección Ajustes del Sistema.
- **Modularización de CSS:** Arquitectura de estilos rediseñada para ser completamente modular (`main.css`, `tokens.css`, `components.css`, `layout.css`, etc.), eliminando la dependencia de hojas de estilo monolíticas (`styles.css` ha sido eliminado).
- **Soporte Nativo de Modo Oscuro:** Integración de un modo oscuro unificado y cohesivo, que puede activarse sin dependencias de terceros gracias al uso intensivo de variables CSS (`dark_mode.css`).
- **Correcciones Visuales (SMTP y Toggles):** Solucionados los problemas de superposición y layout de los selectores tipo interruptor (`toggle-switch`) en el módulo de configuración de SMTP y ajustes del sistema.
- **Mejoras de Íconos:** Renovación y optimización en la carga de íconos para mejorar su aspecto en toda la plataforma.

---

## 🛠️ Pasos para Actualizar en Producción

### Paso 1: Obtener el Código de la Rama `2.5`
En el servidor de producción, navega al directorio del proyecto y cambia a la rama `2.5`:

```bash
# Obtener los últimos cambios del repositorio
git fetch origin

# Cambiar a la rama 2.5 y descargar la actualización
git checkout 2.5
git pull origin 2.5
```

---

### Paso 2: Actualizar Dependencias
En caso de haber actualizaciones de dependencias en `requirements.txt`:

```bash
# Activar entorno virtual (Linux)
source venv/bin/activate
# En Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt
```

---

### Paso 3: Aplicar Migraciones de Base de Datos **[CRÍTICO]**
Si vienes de versiones antiguas (1.x o 2.1), es OBLIGATORIO correr los scripts de migración para actualizar la estructura de la base de datos sin perder información. Si no haces esto, verás errores "500" o los empleados no cargarán.

```bash
# Estando dentro del entorno virtual, ejecuta TODOS estos comandos uno por uno:
python migrations/migration_user_permissions.py
python migrations/migration_additional_permissions.py
python migrations/migration_holidays.py
python migrations/migration_leaves.py
python migrations/migration_positions.py
python migrations/migration_schedules.py
python migrations/migration_split_shifts.py
python migrations/migration_attendance_rules.py
python scripts/migration_audit.py
python scripts/migration_smtp.py
```

---

### Paso 4: Limpieza de Caché del Cliente (Frontend) **[MUY IMPORTANTE]**
Dado que la arquitectura de archivos CSS ha cambiado drásticamente (archivos eliminados y nuevos archivos agregados), es indispensable realizar una recarga profunda en el navegador de los usuarios finales:
1. Pide a todos los administradores/usuarios que presionen **Ctrl + F5** (o **Cmd + Shift + R** en Mac) al entrar al sistema.
2. Esto forzará al navegador a descargar la nueva estructura de `main.css` y descartar la caché obsoleta.

---

### Paso 4: Reiniciar el Backend
Reinicia el servicio para asegurarte de que FastAPI sirva los nuevos archivos estáticos sin problemas:
- **Si usas Windows (start.bat o script de inicio):** Cierra la consola y vuelve a iniciar el servidor.
- **Si usas Linux (systemd):**
  ```bash
  sudo systemctl restart asistencia.service
  ```

---

## 🚨 Solución de Problemas Frecuentes en Producción (Troubleshooting)

Si al actualizar experimentas problemas, aquí tienes los pasos para resolver los más comunes:

### 1. "La interfaz se ve desordenada o faltan estilos" (Problema de Caché CSS)
**Causa:** El navegador de los usuarios está usando el archivo `styles.css` antiguo y no ha descargado la nueva arquitectura modular (`main.css`).
**Solución:**
- Si usas **Nginx** como proxy inverso, asegúrate de purgar la caché y recargar Nginx:
  ```bash
  sudo systemctl reload nginx
  ```
- Obliga a los usuarios a realizar un *Hard Refresh* en sus navegadores: Presionar **Ctrl + F5** (Windows/Linux) o **Cmd + Shift + R** (Mac).
- Alternativamente, puedes forzar la limpieza desde el servidor agregando un parámetro de versión temporal a la carga de estilos (aunque la versión actual ya incluye hashes y estructuras nuevas).

### 2. "Error de git: Your local changes to the following files would be overwritten by merge"
**Causa:** Tienes cambios locales en el servidor de producción (como modificaciones manuales en archivos `.js` o `.css`) que entran en conflicto con la nueva versión.
**Solución:** Restablece tu entorno de producción para que coincida exactamente con GitHub descartando los cambios locales (⚠️ *Nota: esto borrará las ediciones manuales en el código*):
```bash
git fetch origin
git reset --hard origin/2.5
git clean -fd
```

### 3. "Error 500 Interno del Servidor" o la aplicación no inicia
**Causa:** Podría faltar instalar una dependencia nueva o el servicio se quedó colgado.
**Solución:**
- Verifica los logs del sistema para ver el error exacto:
  ```bash
  sudo journalctl -u asistencia.service -f -n 50
  ```
- Asegúrate de haber activado el entorno virtual y reinstalado los requerimientos:
  ```bash
  source venv/bin/activate
  pip install -r requirements.txt
  ```

¡La actualización a la versión 2.5 estará completada y la interfaz lucirá su nuevo diseño modularizado y libre de errores!
