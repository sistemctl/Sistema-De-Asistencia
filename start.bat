@echo off
chcp 65001 > nul
title Sistema de Asistencia - Hikvision DS-K1T323MBWX

echo.
echo  ============================================================
echo  SISTEMA DE CONTROL DE ASISTENCIA
echo  Hikvision DS-K1T323MBWX
echo  ============================================================
echo.

cd /d "%~dp0"

:: Verificar Python. En Windows, "python" puede ser el alias de Microsoft Store.
set "PYTHON_CMD=python"
%PYTHON_CMD% --version > nul 2>&1
if errorlevel 1 (
    set "PYTHON_CMD=py"
    %PYTHON_CMD% --version > nul 2>&1
)
if errorlevel 1 (
    echo [ERROR] Python no esta instalado o no esta en el PATH.
    echo         Descargalo desde https://www.python.org/downloads/
    pause
    exit /b 1
)

:: Crear entorno virtual si no existe
if not exist "venv\" (
    echo [1/4] Creando entorno virtual...
    %PYTHON_CMD% -m venv venv
)

:: Activar entorno virtual
echo [2/4] Activando entorno virtual...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo [ERROR] No se pudo activar el entorno virtual.
    pause
    exit /b 1
)

:: Instalar dependencias
echo [3/4] Instalando dependencias...
python -m pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo [ERROR] No se pudieron instalar las dependencias.
    pause
    exit /b 1
)

:: Iniciar servidor
echo [4/4] Iniciando servidor FastAPI...
echo.
echo  URL del sistema:    http://localhost:8000
echo  Documentacion API:  http://localhost:8000/docs
echo  Usuario admin:      admin / admin123
echo.
echo  NOTA: Si el dispositivo no esta en red, el sistema
echo        funcionara en modo simulado automaticamente.
echo.
echo  Presiona Ctrl+C para detener el servidor.
echo.

python manage.py runserver

pause
