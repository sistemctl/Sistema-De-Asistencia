#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
manage.py — Gestor de tareas administrativas del Sistema de Asistencia.
Proporciona una interfaz única de línea de comandos para correr el servidor,
realizar migraciones, restaurar la base de datos, sembrar datos de prueba y realizar diagnósticos.
"""
import sys
import os
import argparse
import subprocess

def run_script(script_path):
    """Ejecuta un script de Python en un subproceso con el PYTHONPATH correcto."""
    env = os.environ.copy()
    env["PYTHONPATH"] = os.getcwd()
    cmd = [sys.executable, script_path]
    try:
        result = subprocess.run(cmd, env=env)
        return result.returncode == 0
    except Exception as e:
        print(f"❌ Fallo al iniciar subproceso para {script_path}: {e}")
        return False

def runserver(host="0.0.0.0", port=8000, reload=True):
    """Inicia el servidor uvicorn de desarrollo."""
    print(f"🚀 Iniciando servidor FastAPI en http://{host}:{port} ...")
    cmd = [sys.executable, "-m", "uvicorn", "backend.main:app", "--host", host, "--port", str(port)]
    if reload:
        cmd.append("--reload")
    try:
        subprocess.run(cmd, check=True)
    except KeyboardInterrupt:
        print("\n👋 Servidor detenido por el usuario.")
    except Exception as e:
        print(f"❌ Error al iniciar servidor: {e}")

def create_db():
    print("🏗️ Creando base de datos...")
    run_script("scripts/create_db.py")

def reset_db():
    print("🗑️ Resetando base de datos y recreando tablas...")
    run_script("scripts/reset_db.py")

def seed_db():
    print("🧪 Insertando datos de prueba...")
    run_script("scripts/seed_test_data.py")

def check_sync():
    print("📟 Comprobando sincronización biométrica...")
    run_script("scripts/check_sync.py")

def import_historic():
    print("📅 Importando datos históricos...")
    run_script("scripts/import_historic.py")

def run_migrations():
    print("🏃 Ejecutando migraciones del sistema en orden...")
    migrations = [
        "migrations/migration_schedules.py",
        "migrations/migration_positions.py",
        "migrations/migration_schedule_workdays.py",
        "migrations/migration_split_shifts.py",
        "migrations/migration_attendance_rules.py",
        "migrations/add_columns.py"
    ]
    for m in migrations:
        print(f"\n──────────────────────────────────────────────────")
        print(f"📦 Ejecutando {m}...")
        if run_script(m):
            print(f"✅ {m} completado.")
        else:
            print(f"❌ Error al ejecutar la migración {m}. Abortando.")
            sys.exit(1)
    print("\n🎉 ¡Todas las migraciones se han completado con éxito!")

def run_tests():
    print("🧪 Ejecutando pruebas unitarias y de diagnóstico...")
    tests = [
        "tests/test_time.py",
        "tests/test_analytics.py",
        "tests/test_events.py",
        "tests/test_payload.py"
    ]
    failed = 0
    for t in tests:
        print(f"\n──────────────────────────────────────────────────")
        print(f"📦 Ejecutando {t}...")
        if run_script(t):
            print(f"✅ {t} finalizado con éxito.")
        else:
            print(f"❌ Falló {t}.")
            failed += 1
    
    if failed == 0:
        print("\n🎉 ¡Todas las pruebas finalizaron con éxito!")
    else:
        print(f"\n⚠️ Finalizaron con errores. Fallaron {failed} pruebas.")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(
        description="Gestor administrativo del Sistema de Asistencia Hikvision DS-K1T323MBWX.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Comandos disponibles:
  runserver         Inicia el servidor web FastAPI (desarrollo)
  create-db         Crea la base de datos de Postgres si no existe
  reset-db          Resetea y vuelve a estructurar la base de datos
  seed-db           Siembra la base de datos con datos de prueba
  migrate           Ejecuta todas las migraciones del sistema en orden
  check-sync        Verifica el estado de sincronización y logs del biométrico
  import-historic   Importa registros históricos guardados
  test              Ejecuta los scripts de prueba y diagnóstico
        """
    )
    parser.add_argument("command", choices=[
        "runserver", "create-db", "reset-db", "seed-db", "migrate", "check-sync", "import-historic", "test"
    ], help="Comando a ejecutar")
    parser.add_argument("--host", default="0.0.0.0", help="Host para el servidor uvicorn (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=8000, help="Puerto para el servidor uvicorn (default: 8000)")
    parser.add_argument("--no-reload", action="store_true", help="Desactiva el auto-reload en uvicorn")

    args = parser.parse_args()

    # Mapeo de comandos
    if args.command == "runserver":
        runserver(host=args.host, port=args.port, reload=not args.no_reload)
    elif args.command == "create-db":
        create_db()
    elif args.command == "reset-db":
        reset_db()
    elif args.command == "seed-db":
        seed_db()
    elif args.command == "migrate":
        run_migrations()
    elif args.command == "check-sync":
        check_sync()
    elif args.command == "import-historic":
        import_historic()
    elif args.command == "test":
        run_tests()

if __name__ == "__main__":
    main()
