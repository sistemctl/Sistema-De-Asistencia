@echo off
chcp 65001 > nul
title Sistema de Asistencia — Hikvision DS-K1T323MBWX

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║   SISTEMA DE CONTROL DE ASISTENCIA                      ║
echo  ║   Hikvision DS-K1T323MBWX                               ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: Verificar Python
python --version > nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python no está instalado o no está en el PATH.
    echo         Descárgalo desde https://www.python.org/downloads/
    pause
    exit /b 1
)

:: Crear entorno virtual si no existe
if not exist "venv\" (
    echo [1/4] Creando entorno virtual...
    python -m venv venv
)

:: Activar entorno virtual
echo [2/4] Activando entorno virtual...
call venv\Scripts\activate.bat

:: Instalar dependencias
echo [3/4] Instalando dependencias...
pip install -r requirements.txt --quiet

:: Iniciar servidor
echo [4/4] Iniciando servidor FastAPI...
echo.
echo  URL del sistema:  http://localhost:8000
echo  Documentación API: http://localhost:8000/docs
echo  Usuario admin:    admin / admin123
echo.
echo  NOTA: Si el dispositivo no está en red, el sistema
echo        funcionará en modo simulado automáticamente.
echo.
echo  Presiona Ctrl+C para detener el servidor.
echo.

python manage.py runserver

pause
