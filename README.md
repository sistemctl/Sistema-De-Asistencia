# 📋 Sistema de Control de Asistencia — Hikvision DS-K1T323MBWX

Este es un sistema completo para el control y registro de asistencia usando el terminal biométrico facial **Hikvision DS-K1T323MBWX**. Está desarrollado con **FastAPI** en el backend, **PostgreSQL** como base de datos y un frontend moderno con **HTML/CSS/JS**.

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
   - Simplemente haz doble clic en el archivo **`start.bat`**. 
   - *Este archivo automáticamente creará un entorno virtual, instalará las dependencias necesarias y arrancará el servidor.*

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

## 🐙 3. Cómo subir cambios a GitHub

Si modificas el código (agregas nuevas funcionalidades, modificas el diseño, etc.) y quieres guardar esos cambios en GitHub, abre la terminal en la carpeta del proyecto y ejecuta estos tres comandos:

1. **Añadir todos los archivos modificados:**
   ```bash
   git add .
   ```
2. **Crear el "paquete" de cambios con un mensaje descriptivo:**
   ```bash
   git commit -m "Descripción de lo que modificaste (ej: Agregado nuevo reporte de horas)"
   ```
3. **Subir los cambios al repositorio en internet:**
   ```bash
   git push origin main
   ```

---

## 🌐 4. Proceso de despliegue (Cómo subirlo a un Servidor Real / VPS)

Para poner este sistema en producción en un servidor real (como AWS, DigitalOcean, Hostinger VPS, etc.), los pasos generales son:

1. **Contratar un Servidor (VPS):** Un servidor Linux (Ubuntu 22.04 recomendado).
2. **Instalar dependencias en el servidor:**
   - Instalar `Python 3` y `PostgreSQL`.
   - Configurar la base de datos `asistencia` en el PostgreSQL del servidor.
3. **Subir el código:**
   - Acceder al servidor por SSH y clonar el repositorio:
     `git clone https://github.com/sistemctl/Sistema-De-Asistencia.git`
4. **Configurar como Servicio de Producción:**
   - En producción **no** se usa `start.bat`.
   - Se debe instalar **Gunicorn** como servidor de aplicaciones para correr FastAPI.
   - Configurar un proxy inverso con **Nginx** para que reciba las peticiones del puerto 80 (HTTP) o 443 (HTTPS) y las mande al puerto de FastAPI (8000).
5. **Asegurar la red:**
   - El servidor en la nube debe poder alcanzar la IP de tu dispositivo Hikvision (esto suele requerir configuración de redes, como VPN o port-forwarding en la ubicación física donde esté el dispositivo biométrico, o instalar el backend en una computadora física dentro de la misma red local del dispositivo y exponer solo el puerto 8000 al exterior).

> [!WARNING]  
> **Comunicación con el biométrico:** Dado que el biométrico funciona en una red local (LAN, ej: `192.168...`), si instalas el sistema en un servidor de internet (Nube), el servidor de internet NO podrá "ver" al dispositivo.  
> **Solución:** Lo ideal para este tipo de arquitecturas ISAPI es que **el servidor (este código) se instale en una computadora/servidor físico dentro del mismo edificio** que el biométrico. Luego, puedes exponer esa computadora a internet para poder ver el sistema web desde tu casa u otra ciudad.
