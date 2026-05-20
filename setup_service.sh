#!/bin/bash
# ============================================================
# Script de configuración del Servicio de Asistencias
# Ejecutar con: sudo bash /opt/sistema-de-asistencias/setup_service.sh
# ============================================================

set -e  # Detener si cualquier comando falla

PROJECT_DIR="/opt/sistema-de-asistencias"
SERVICE_NAME="asistencia"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
VENV_DIR="${PROJECT_DIR}/venv"
USER_NAME="ubuntu"

echo "========================================"
echo "  Configurando Servicio de Asistencias"
echo "========================================"

# 1. Instalar dependencias del sistema
echo ""
echo "[1/6] Instalando python3-venv y pip..."
apt install -y python3.14-venv python3-pip 2>&1 | grep -E "(install|already|error)" || true
echo "OK"

# 2. Recrear el entorno virtual con pip
echo ""
echo "[2/6] Recreando entorno virtual en ${VENV_DIR}..."
rm -rf "${VENV_DIR}"
python3 -m venv "${VENV_DIR}"
echo "OK"

# 3. Instalar dependencias de Python
echo ""
echo "[3/6] Instalando dependencias (puede tardar unos minutos)..."
"${VENV_DIR}/bin/pip" install --upgrade pip --quiet
"${VENV_DIR}/bin/pip" install -r "${PROJECT_DIR}/requirements.txt" --quiet
echo "OK"

# 4. Verificar que uvicorn fue instalado
if [ ! -f "${VENV_DIR}/bin/uvicorn" ]; then
    echo "ERROR: uvicorn no se instaló correctamente en el venv"
    exit 1
fi
echo ""
echo "[4/6] Uvicorn verificado en ${VENV_DIR}/bin/uvicorn"

# 5. Dar permisos al usuario ubuntu sobre el proyecto
echo ""
echo "[5/6] Asignando permisos al usuario ${USER_NAME}..."
chown -R "${USER_NAME}:${USER_NAME}" "${PROJECT_DIR}"
chmod -R 755 "${PROJECT_DIR}"
echo "OK"

# 6. Crear el archivo de servicio systemd
echo ""
echo "[6/6] Creando archivo de servicio systemd..."
cat > "${SERVICE_FILE}" << 'EOF'
[Unit]
Description=Servicio de Control de Asistencia Hikvision
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
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
EOF
echo "OK"

# 7. Recargar systemd, habilitar e iniciar el servicio
echo ""
echo "Recargando systemd y activando el servicio..."
systemctl daemon-reload
systemctl enable "${SERVICE_NAME}.service"
systemctl restart "${SERVICE_NAME}.service"

# 8. Esperar y verificar estado
sleep 3
echo ""
echo "========================================"
echo "           ESTADO DEL SERVICIO"
echo "========================================"
systemctl status "${SERVICE_NAME}.service" --no-pager -l

echo ""
echo "========================================"
if systemctl is-active --quiet "${SERVICE_NAME}.service"; then
    echo "✅ SERVICIO ACTIVO Y CORRIENDO EN PUERTO 8000"
    echo "   Accede en: http://localhost:8000"
else
    echo "❌ El servicio no está activo. Revisa los logs con:"
    echo "   sudo journalctl -u ${SERVICE_NAME}.service -n 50 --no-pager"
fi
echo "========================================"
