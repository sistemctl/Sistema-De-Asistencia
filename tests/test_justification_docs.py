import sys
import os
from pathlib import Path
from datetime import date

# Configurar PYTHONPATH para que reconozca el módulo backend
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from backend.database import SessionLocal
from backend.models import AttendanceJustification, Employee, SystemConfig
from backend.services.attendance_processor import calculate_daily_summary

def test_justification_document():
    print("🧪 Iniciando pruebas de diagnóstico para la Gestión Documental...")
    db = SessionLocal()
    try:
        # 1. Verificar existencia de la columna document_path en la base de datos
        # Al hacer una consulta básica o crear un objeto temporal sin hacer commit
        just_col_exists = hasattr(AttendanceJustification, 'document_path')
        assert just_col_exists, "El modelo 'AttendanceJustification' no tiene el atributo 'document_path'"
        print("✅ Atributo 'document_path' en el modelo ORM validado.")
        
        # Consultar el primer registro para probar que la BD no arroja error
        db.query(AttendanceJustification).first()
        print("✅ Acceso físico a la tabla 'attendance_justifications' en PostgreSQL verificado.")

        # 2. Verificar que calculate_daily_summary serialice document_path correctamente
        emp = db.query(Employee).first()
        if not emp:
            print("⚠️ Omitiendo prueba de calculate_daily_summary: No hay empleados registrados en la BD.")
            print("🎉 ¡Estructura de Base de Datos e Integración del Modelo validadas correctamente!")
            return

        config = db.query(SystemConfig).first()
        
        # Crear objeto mock en memoria (no persistido)
        mock_just = AttendanceJustification(
            id=99999,
            employee_id=emp.id,
            date=date.today(),
            justification_type="absence",
            reason="Test de diagnóstico justificante",
            override_status="present",
            document_path="justifications/just_test.pdf"
        )
        
        summary = calculate_daily_summary(
            employee=emp,
            records=[],
            target_date=date.today(),
            config=config,
            justification=mock_just
        )
        
        assert summary.get("justification") is not None, "El summary no cargó la justificación."
        assert summary["justification"].get("document_path") == "justifications/just_test.pdf", "El campo 'document_path' no se serializó."
        print("✅ Serialización de 'document_path' en calculate_daily_summary verificada correctamente.")
        
        print("🎉 ¡Todas las pruebas de diagnóstico de Gestión Documental pasaron correctamente!")
        
    except AssertionError as ae:
        print(f"❌ Falló validación de aserción: {ae}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error durante las pruebas de justificación: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    test_justification_document()
