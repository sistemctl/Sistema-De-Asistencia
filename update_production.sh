#!/bin/bash
# Script automatizado para el Agente Linux o Administrador de Producción
echo "==========================================================="
echo " INICIANDO ACTUALIZACIÓN DEL SISTEMA DE ASISTENCIA (v2.5)  "
echo "==========================================================="

echo "[1/4] Descargando la última versión del código desde GitHub..."
git fetch origin
git reset --hard origin/2.5
git clean -fd

echo "[2/4] Instalando requerimientos y activando entorno..."
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "Advertencia: Entorno virtual 'venv' no encontrado. Asegúrate de tener las dependencias correctas."
fi
pip install -r requirements.txt

echo "[3/4] Ejecutando las migraciones de Base de Datos (OBLIGATORIAS para reparar empleados y dashboard)..."
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
python scripts/fix_db_schema.py
echo "✔ Migraciones de Base de Datos finalizadas exitosamente."

echo "[4/4] Reiniciando el servicio de backend..."
sudo systemctl restart asistencia.service || echo "⚠️ Advertencia: no se pudo reiniciar asistencia.service automáticamente. Reinícialo de forma manual o asegúrate de que el nombre del servicio sea correcto."

echo "==========================================================="
echo " ✔ ACTUALIZACIÓN COMPLETADA CON ÉXITO"
echo "==========================================================="
echo "⚠️ NOTA IMPORTANTE PARA EL AGENTE/ADMINISTRADOR:"
echo "Comunícale a los usuarios que DEBEN recargar la interfaz con [Ctrl + F5] o vaciar la caché para cargar la nueva interfaz correctamente."
