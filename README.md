# 📋 Sistema de Control de Asistencia — Hikvision DS-K1T323MBWX (v1.1)

Este es un sistema completo para el control y registro de asistencia usando el terminal biométrico facial **Hikvision DS-K1T323MBWX**. Está desarrollado con **FastAPI** en el backend, **PostgreSQL** como base de datos y un frontend moderno con **HTML/CSS/JS**.

### 🌟 Novedades de la Versión 1.1
* **Tolerancias de Entrada y Salida Configurables:** Ahora es posible definir de forma dinámica desde la web los minutos de tolerancia para la llegada de personal.
* **Importación Histórica Inteligente por Fechas:** Nuevo módulo con barra de carga animada y anti-bloqueo que permite extraer y consolidar asistencias de meses pasados directo desde el biométrico.
* **Filtro Automático de Desconocidos:** El sistema ignora de forma inteligente cualquier intento de autenticación que no corresponda a un empleado registrado.
* **Arranque Automático en Linux:** Soporte completo para correr como un servicio de sistema continuo (`systemd`).

---

## 🚀 1. Cómo encender el servidor (Desarrollo Local)

Para ejecutar el proyecto en tu computadora local:

1. **Requisitos previos:**
   - [Python 3.11+](https://www.python.org/downloads/) instalado.
   - Base de datos **PostgreSQL** corriendo localmente con una base de datos llamada `asistencia`.
   - Clonar este repositorio.

2. **Configurar las credenciales:**
   - Abre el archivo `.env` en la raíz del proyecto.
   - Configura las variables de tu base de datos y del dispositivo Hikvision.

3. **Arrancar el sistema:**
   - **En Windows:** Simplemente haz doble clic en el archivo **`start.bat`**. 
     *Este archivo automáticamente creará un entorno virtual, instalará las dependencias necesarias y arrancará el servidor.*
   - **En Linux:** Ejecuta en la terminal:
     ```bash
     source venv/bin/activate
     python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
     ```

4. **Acceso:**
   - Abre el navegador y ve a: **http://localhost:8000**
   - Usuario por defecto: `admin`
   - Contraseña por defecto: `admin123`

---

## 📦 2. Cómo clonar e instalar el proyecto en otra computadora

Si quieres descargar este código fuente en otra computadora y hacerlo funcionar desde cero:

1. **Clonar el repositorio:**
   Abre la terminal de la nueva computadora y ejecuta:
   ```bash
   git clone https://github.com/sistemctl/Sistema-De-Asistencia.git
   cd Sistema-De-Asistencia
   ```

2. **Crear archivo `.env`:**
   Como el archivo `.env` no se sube a GitHub por seguridad, debes crear uno nuevo en la raíz del proyecto con el siguiente contenido y adaptarlo:
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

3. **Instalación e inicio:**
   - Si estás en Windows, haz doble clic en `start.bat`.
   - Si estás en Linux/Mac:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     pip install -r requirements.txt
     python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
     ```

---

## 🛠️ 3. Configuración como Servicio de Linux (Systemd)

Para que el servidor se encienda **automáticamente al prender la computadora** (sin tener que abrir la terminal o dejar una consola abierta):

1. **Crea el archivo del servicio de sistema:**
   ```bash
   sudo nano /etc/systemd/system/asistencia.service
   ```

2. **Pega la siguiente estructura de configuración (adaptando la ruta de tu proyecto):**
   ```ini
   [Unit]
   Description=Servicio de Control de Asistencia Hikvision
   After=network.target postgresql.service

   [Service]
   User=cesar
   WorkingDirectory=/home/cesar/Descargas/Asistencia
   ExecStart=/home/cesar/Descargas/Asistencia/venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

3. **Activa e inicia el servicio en Linux:**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable asistencia
   sudo systemctl start asistencia
   ```

4. **Comandos útiles del servicio:**
   * Ver el estado en vivo: `sudo systemctl status asistencia`
   * Reiniciar el servidor: `sudo systemctl restart asistencia`
   * Detener el servidor: `sudo systemctl stop asistencia`

---

## 🧰 4. Scripts y Utilidades de Soporte Incorporados

En la raíz del proyecto encontrarás scripts listos para tareas directas de administración:

* **`import_historic.py`**: Script de consola ultra robusto para extraer datos históricos. Permite sincronizar manualmente tramos específicos de años anteriores saltándose las restricciones de hardware del biométrico.
* **`clear_db.py`**: Limpiador seguro para base de datos local. Borra selectivamente las tablas de asistencias (`AttendanceRecord`) y empleados (`Employee`) para realizar una nueva importación limpia desde el terminal.
* **`add_columns.py`**: Agrega de forma rápida las nuevas columnas de configuración a la base de datos sin alterar los registros existentes.

---

## 🐙 5. Cómo subir cambios a GitHub

Si modificas el código (agregas nuevas funcionalidades, modificas el diseño, etc.) y quieres guardar esos cambios en tu repositorio, abre la terminal en la carpeta del proyecto y ejecuta estos comandos:

1. **Añadir todos los archivos modificados:**
   ```bash
   git add .
   ```
2. **Crear el "paquete" de cambios con un mensaje descriptivo:**
   ```bash
   git commit -m "Descripción de lo que modificaste (ej: Agregado nuevo reporte de horas)"
   ```
3. **Subir los cambios al repositorio a la versión activa:**
   ```bash
   git push origin 1.1
   ```

---

## 🌐 6. Proceso de despliegue (Cómo subirlo a un Servidor Real / VPS)

Para poner este sistema en producción en un servidor real (como AWS, DigitalOcean, Hostinger VPS, etc.), los pasos generales son:

1. **Contratar un Servidor (VPS):** Un servidor Linux (Ubuntu 22.04 recomendado).
2. **Instalar dependencias en el servidor:**
   - Instalar `Python 3` y `PostgreSQL`.
   - Configurar la base de datos `asistencia` en el PostgreSQL del servidor.
3. **Subir el código:**
   - Acceder al servidor por SSH y clonar el repositorio:
     `git clone https://github.com/sistemctl/Sistema-De-Asistencia.git`
4. **Configurar como Servicio de Producción:**
   - Configurar el Nginx como proxy inverso para que exponga el puerto 80/443 de forma segura y segura redirija las peticiones a FastAPI.

> [!WARNING]  
> **Comunicación con el biométrico:** Dado que el biométrico funciona en una red local (LAN, ej: `192.168...`), si instalas el sistema en un servidor de internet (Nube), el servidor de internet NO podrá "ver" al dispositivo.  
> **Solución:** Lo ideal para este tipo de arquitecturas ISAPI es que **el servidor (este código) se instale en una computadora/servidor físico dentro del mismo edificio** que el biométrico. Luego, puedes exponer esa computadora a internet para poder ver el sistema web desde tu casa u otra ciudad.
