# Guía de Actualización a la Versión 2.1 🚀

Esta guía contiene los pasos necesarios para actualizar el **Sistema de Asistencia** de la versión 2.0 a la **versión 2.1** en el entorno de producción.

---

## 📋 Resumen de Cambios en la v2.1
- **Nueva Identidad Visual (Corporate Precision):** Migración de componentes visuales a tarjetas estilizadas (`corp-card`), fuentes tipográficas modernas (*Hanken Grotesk* y *Plus Jakarta Sans*) y diseño premium sin bordes genéricos.
- **Mejoras en Reportes:** Eliminación de popups molestos (`alert`) y optimización de gráficos Chart.js.
- **Estructura Organizada del Proyecto:** Reubicación de scripts de migración y utilidades a las carpetas `migrations/`, `scripts/` y `tests/` para mantener limpio el directorio raíz.
- **Esquema de Base de Datos:** Nuevas tablas de configuración y soporte mejorado para horarios diarios.

---

## 🛠️ Pasos para Actualizar en Producción

### Paso 1: Obtener el Código de la Rama `2.1`
En el servidor de producción, navega al directorio del proyecto y descarga la rama `2.1`:

```bash
# Asegurar que estamos en la rama correcta y traer los últimos cambios
git fetch origin
git checkout 2.1
git pull origin 2.1
```

---

### Paso 2: Aplicar Migraciones de Base de Datos (PostgreSQL)
Si tu base de datos no tiene las últimas columnas o tablas de configuración de colores/parámetros, debes ejecutar las migraciones correspondientes utilizando Python:

```bash
# Activar entorno virtual
# En Windows:
venv\Scripts\activate
# En Linux:
source venv/bin/activate

# Ejecutar las migraciones estructuradas
python migrations/add_columns.py
python migrations/migration_background_colors.py
python migrations/migration_attendance_rules.py
python migrations/migration_schedule_workdays.py
```

---

### Paso 3: Reiniciar el Backend (Python/FastAPI)
Para aplicar los cambios en las rutas, modelos y lógicas del servidor:
- **Si usas Windows (start.bat o script de inicio):** Cierra la consola actual del backend y vuelve a ejecutar `start.bat`.
- **Si usas Linux (systemd):**
  ```bash
  sudo systemctl restart asistencia-backend
  ```
- **Si usas PM2:**
  ```bash
  pm2 restart asistencia-backend
  ```

---

### Paso 4: Limpieza de Caché del Cliente (Frontend)
Debido a que los archivos estáticos de la interfaz (`.html`, `.css` y `.js`) suelen quedar guardados en el navegador:
1. **Forzar recarga en el navegador:** Pide a los usuarios que abran la aplicación y presionen **Ctrl + F5** (o **Cmd + Shift + R** en Mac) para forzar la actualización de los scripts y estilos.
2. **Si usas Nginx para servir el frontend:** Asegúrate de reiniciar o recargar Nginx para limpiar posibles cachés de archivos:
   ```bash
   sudo systemctl reload nginx
   ```
