# 📋 Sistema de Control de Asistencia — Hikvision DS‑K1T323MBWX **v1.9.0**

Este es un sistema completo para el control y registro de asistencia usando el terminal biométrico facial **Hikvision DS‑K1T323MBWX**. Está desarrollado con **FastAPI** en el backend, **PostgreSQL** como base de datos y un frontend moderno con **HTML/CSS/JS** en Glassmorphism Premium.

### 🌟 Novedades de la Versión 1.9.0
* **Rediseño Visual Premium (Light Mode):** Evolución hacia un entorno limpio y sofisticado en tonalidades claras (`#f8fafc`), conservando elementos modernos de diseño y mejorando la legibilidad.
* **Branding Corporativo Consolidado:** Integración perfeccionada de los colores primario y secundario en la interfaz, con mejoras de consistencia en todas las vistas de administración y reportes.

### 🌟 Novedades de la Versión 1.8.0
* **Personalización de Marca y Branding Corporativo:** Incorporación de un panel de configuración del sistema (`settings`) que permite personalizar el nombre de la aplicación, el nombre de la empresa, los colores primarios y de acento en el frontend (actualizando dinámicamente los orbes Mesh HSL del fondo), y subir un logotipo corporativo personalizado (PNG, JPG, JPEG, SVG) visible en la pantalla de inicio de sesión y en la barra lateral.
* **Persistencia en Base de Datos:** Guardado y recuperación de la personalización de marca a través de la nueva tabla `system_config` en PostgreSQL.

### 🌟 Novedades de la Versión 1.6.0
* **Panel de Reportes y Analíticas Unificado:** Rediseño completo de la experiencia de usuario (UX). Se eliminaron múltiples selectores de fecha redundantes a favor de una **Topbar de Filtros Única**. Al filtrar por fecha, empleado o granularidad, se actualizan simultáneamente las tarjetas de KPI premium, los gráficos de Chart.js y el listado de asistencia en tiempo real.
* **Botonera de Exportación en un Clic (Excel, PDF, Consolidado):** Descargas estructuradas automáticas aplicando los filtros del panel superior de forma inmediata.
* **Gestión de Horarios y Jornadas Flexibles:** Soporte completo en base de datos (`schedules` CRUD) y visualización para turnos de **Jornada Continua** y **Jornada Partida** (doble marcación con control de almuerzo y tolerancia configurable).
* **Cargos y Posiciones Estructuradas:** Nueva tabla `positions` con relación de clave foránea en la tabla de empleados, reemplazando la columna de texto plano por cargos normalizados.
* **Scripts de Migración Segura:** Herramientas automáticas en la raíz del proyecto para actualizar la base de datos de versiones anteriores sin riesgo de pérdida de datos.

### 🌟 Novedades de la Versión 1.5
* **Rediseño con Flatpickr:** Incorporación de selectores de rango de fechas profesionales (`flatpickr`) en los módulos de Asistencia y Reportes, con total integración visual al ecosistema Dark Mode.
* **Sincronización Paginada (Import Historic):** Mejoras en el módulo de extracción histórica para garantizar la integridad de los datos importados del biométrico, evitando errores por desbordamiento de memoria.
* **Fix de UI Premium:** Corrección de estilos CSS en los inputs y componentes flotantes para mantener el glassmorphism del tema en el modo oscuro.

### 🌟 Novedades de la Versión 1.3
* **Diseño Elite Premium Dark Mode:** Rediseñado en Glassmorphism de alta fidelidad con orbes Mesh HSL animados en segundo plano, tipografía moderna (`Plus Jakarta Sans` y `JetBrains Mono`).
* **Módulo de Gestión de Usuarios y Roles (RBAC):** Control de acceso administrativo robusto con tres roles configurables: Super Administrador, Gestor de RRHH y Auditor/Lector.
* **Integración Visual de Vacaciones y Permisos:** Panel de KPI violeta para monitorear personal justificado.
* **Seguridad y Ocultamiento Inteligente de Sidebar:** Menú lateral adaptativo según rol.

### 🌟 Novedades de la Versión 1.1
* **Tolerancias de Entrada y Salida Configurables** desde la web.
* **Importación Histórica Inteligente por Fechas** con barra de carga animada.
* **Filtro Automático de Desconocidos** que ignora autenticaciones no registradas.
* **Arranque Automático en Linux** mediante systemd.

---

## 🚀 1️⃣  Cómo arrancar el proyecto (desarrollo local)

1. **Requisitos previos:**
   - Python 3.11+.
   - PostgreSQL con una base de datos `asistencia`.
   - Clonar este repositorio.

2. **Configurar credenciales:**
   - Edita el archivo `.env` en la raíz del proyecto con los valores de tu base de datos y dispositivo Hikvision.

3. **Arrancar el sistema:**
   - En Linux:
     ```bash
     source venv/bin/activate
     python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
     ```
   - En Windows ejecuta `start.bat`.

4. **Acceso:**
   - Navega a `http://localhost:8000`.
   - Usuario/contraseña por defecto: `admin` / `admin123`.

---

## 📦 2️⃣  Clonar e instalar el proyecto en otra máquina

```bash
git clone https://github.com/sistemctl/Sistema-De-Asistencia.git
cd Sistema-De-Asistencia
```

Crea un `.env` con:
```ini
DB_HOST=localhost
DB_PORT=5432
DB_NAME=asistencia
DB_USER=postgres
DB_PASSWORD=TuContraseñaSecreta

SECRET_KEY=clave-secreta-larga-y-segura

DEVICE_IP=192.168.4.137
DEVICE_PORT=80
DEVICE_USERNAME=admin
DEVICE_PASSWORD=TuContrasenaHikvision
```

Instala dependencias y lanza:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
---

## 🛠️ 3️⃣  Ejecutar como servicio systemd (Linux)

```bash
sudo nano /etc/systemd/system/asistencia.service
```
Pegá lo siguiente (adaptá la ruta a tu proyecto):
```ini
[Unit]
Description=Servicio de Control de Asistencia Hikvision
After=network.target postgresql.service

[Service]
User=ubuntu
Group=ubuntu
WorkingDirectory=/opt/sistema-de-asistencias
EnvironmentFile=/opt/sistema-de-asistencias/.env
ExecStart=/opt/sistema-de-asistencias/venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=asistencia

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable asistencia
sudo systemctl start asistencia
```
---

## 🧰 4️⃣  Scripts y utilidades de soporte

- `import_historic.py`: Extrae datos históricos de eventos directamente desde el biométrico Hikvision.
- `clear_db.py`: Limpia de forma segura todas las tablas de asistencia y empleados en la base de datos.
- `seed_test_data.py`: Genera departamentos, cargos, horarios y registros de asistencia simulados con fines de desarrollo y demostración.
- `migration_positions.py`: Crea la tabla `positions` y migra automáticamente los cargos antiguos de texto plano (`position`) a la tabla estructurada.
- `migration_schedules.py`: Crea e inicializa la tabla de horarios `schedules` enlazándola con los empleados.
- `migration_split_shifts.py`: Agrega las columnas de soporte para jornada partida y almuerzo a la tabla `schedules`.
---

## 🐙 5️⃣  Subir cambios a GitHub

```bash
git add .
git commit -m "Actualiza documentación para la versión 1.9"
git push origin 1.9
```
---

## 🌐 6️⃣  Despliegue en producción (VPS/servidor real)

1. **Contratar un VPS** (Ubuntu 22.04 recomendado).
2. **Instalar dependencias**: `python3`, `postgresql`, `git`.
3. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/sistemctl/Sistema-De-Asistencia.git
   cd Sistema-De-Asistencia
   ```
4. **Configurar Nginx** como proxy inverso hacia `uvicorn`.
> **⚠️ Advertencia:** El biométrico está en LAN; el servidor debe estar en la misma red local o usar túneles VPN.
---
