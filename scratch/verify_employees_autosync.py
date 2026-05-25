import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    from backend.routers.employees import router
    print("El archivo employees.py compilo con éxito. Sin errores de sintaxis o importación.")
except Exception as e:
    print(f"Error de importación/sintaxis en employees.py: {e}")
    sys.exit(1)
