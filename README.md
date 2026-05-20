# 📋 Sistema de Control de Asistencia — Hikvision DS‑K1T323MBWX **v1.5**

Este es un sistema completo para el control y registro de asistencia usando el terminal biométrico facial **Hikvision DS‑K1T323MBWX**. Está desarrollado con **FastAPI** en el backend, **PostgreSQL** como base de datos y un frontend moderno con **HTML/CSS/JS**.

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

- `import_historic.py`: extrae datos históricos del biométrico.
- `clear_db.py`: limpia tablas de asistencia y empleados.
- `add_columns.py`: agrega columnas nuevas a la base de datos.
---

## 🐙 5️⃣  Subir cambios a GitHub

```bash
git add .
git commit -m "Actualiza documentación para la versión 1.5"
git push origin 1.5
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
