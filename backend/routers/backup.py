import os
import subprocess
import datetime
import zipfile
import shutil
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from backend.database import get_db, engine
from backend.auth import get_current_user, check_permission
from backend.models import User
from backend.config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

router = APIRouter(prefix="/api/backup", tags=["backup"])

def find_pg_binary(binary_name: str) -> str:
    # 1. Probar si está en el PATH
    path = shutil.which(binary_name)
    if path:
        return path
        
    # 2. Buscar en directorios típicos de instalación de Postgres en Windows
    common_dirs = [
        r"C:\Program Files\PostgreSQL\18\bin",
        r"C:\Program Files\PostgreSQL\17\bin",
        r"C:\Program Files\PostgreSQL\16\bin",
        r"C:\Program Files\PostgreSQL\15\bin",
        r"C:\Program Files\PostgreSQL\14\bin",
    ]
    for d in common_dirs:
        full_path = os.path.join(d, f"{binary_name}.exe")
        if os.path.exists(full_path):
            return full_path
            
    return binary_name

@router.get("/export")
def export_backup(
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("perm_manage_settings"))
):
    try:
        from backend.services.backup_service import create_backup_zip
        temp_dir = "temp_export_dir"
        os.makedirs(temp_dir, exist_ok=True)
        backup_zip_path = create_backup_zip(temp_dir)
        filename = os.path.basename(backup_zip_path)
        
        def iterfile():
            with open(backup_zip_path, mode="rb") as f:
                yield from f
            try:
                os.remove(backup_zip_path)
                os.rmdir(temp_dir)
            except Exception:
                pass
                
        from backend.services.audit import log_action
        log_action(db, current_user.id, "EXPORT", "Database", "0", "Copia de seguridad completa descargada")

        return StreamingResponse(
            iterfile(), 
            media_type="application/zip", 
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar backup: {str(e)}")

@router.post("/restore")
async def restore_backup(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(check_permission("perm_manage_settings"))
):
    host = DB_HOST
    port = DB_PORT
    name = DB_NAME
    user = DB_USER
    password = DB_PASSWORD
    
    temp_dir = "temp_restore_dir"
    os.makedirs(temp_dir, exist_ok=True)
    temp_file = os.path.join(temp_dir, "uploaded_file.tmp")
    
    try:
        with open(temp_file, "wb") as f:
            f.write(await file.read())
            
        sql_file_to_restore = temp_file
            
        # Check if zip
        is_zip = zipfile.is_zipfile(temp_file)
        if is_zip:
            with zipfile.ZipFile(temp_file, 'r') as zip_ref:
                zip_ref.extractall(temp_dir)
                
            extracted_files = os.listdir(temp_dir)
            sql_files = [f for f in extracted_files if f.endswith('.sql') or f.endswith('.backup')]
            if sql_files:
                sql_file_to_restore = os.path.join(temp_dir, sql_files[0])
            
            uploads_extracted = os.path.join(temp_dir, "uploads")
            if os.path.exists(uploads_extracted):
                dest_uploads = os.path.abspath("uploads")
                os.makedirs(dest_uploads, exist_ok=True)
                for root, dirs, files in os.walk(uploads_extracted):
                    for name_file in files:
                        s = os.path.join(root, name_file)
                        rel = os.path.relpath(root, uploads_extracted)
                        d_dir = os.path.join(dest_uploads, rel)
                        os.makedirs(d_dir, exist_ok=True)
                        shutil.copy2(s, os.path.join(d_dir, name_file))

        # Detener el planificador de tareas en segundo plano para evitar nuevas conexiones concurrentes
        from backend.services.scheduler import stop_scheduler
        try:
            stop_scheduler()
        except Exception:
            pass

        # Cerrar la sesión de la petición actual y liberar el pool para evitar bloqueos (deadlocks) con pg_restore
        db.close()
        engine.dispose()

        env = os.environ.copy()
        env["PGPASSWORD"] = password
        
        # pg_restore
        cmd = [
            find_pg_binary("pg_restore"),
            "-h", host,
            "-p", port,
            "-U", user,
            "-d", name,
            "-c",
            "--if-exists",
            sql_file_to_restore
        ]
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        
        if result.returncode != 0:
            # Fallback a psql
            cmd_sql = [
                find_pg_binary("psql"),
                "-h", host,
                "-p", port,
                "-U", user,
                "-d", name,
                "-f", sql_file_to_restore
            ]
            result_sql = subprocess.run(cmd_sql, env=env, capture_output=True, text=True)
            if result_sql.returncode != 0:
                raise Exception(f"pg_restore falló y fallback psql también falló. psql error: {result_sql.stderr}")
                
        # Auditoría
        from backend.database import SessionLocal
        db_audit = SessionLocal()
        from backend.services.audit import log_action
        log_action(db_audit, current_user.id, "RESTORE", "Database", "0", "Base de datos e imágenes restauradas desde copia de seguridad")
        db_audit.close()
        
        return {"status": "success", "message": "Sistema restaurado correctamente (Base de datos e imágenes)."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al restaurar: {str(e)}")
    finally:
        # Volver a iniciar el planificador de tareas
        try:
            from backend.services.scheduler import start_scheduler
            start_scheduler()
        except Exception:
            pass

        if os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
            except Exception:
                pass


@router.get("/browse-directories")
def browse_directories(
    path: Optional[str] = None,
    current_user: User = Depends(check_permission("perm_manage_settings"))
):
    import string
    
    # 1. Obtener unidades en Windows si no hay ruta o es '/'
    drives = []
    if os.name == 'nt':
        for letter in string.ascii_uppercase:
            drive = f"{letter}:\\"
            if os.path.exists(drive):
                drives.append(drive)
                
    # Determinar la ruta actual a listar
    current_path = ""
    if not path or path.strip() == "" or path.strip() == "/":
        # Por defecto, listar las unidades en Windows o directorio de trabajo
        if os.name == 'nt' and drives:
            # Mandar información de las unidades
            return {
                "current_path": "/",
                "parent_path": "",
                "subdirectories": [{"name": drive, "path": drive} for drive in drives],
                "is_root": True
            }
        else:
            # En Linux o si no hay unidades, listar el CWD
            current_path = os.path.abspath(os.getcwd())
    else:
        current_path = os.path.abspath(path)
        
    if not os.path.exists(current_path):
        raise HTTPException(status_code=404, detail="La ruta especificada no existe.")
        
    if not os.path.isdir(current_path):
        raise HTTPException(status_code=400, detail="La ruta especificada no es una carpeta.")
        
    # Obtener subcarpetas
    subdirs = []
    try:
        for item in os.listdir(current_path):
            item_path = os.path.join(current_path, item)
            # Omitir archivos, carpetas ocultas/sistema que empiezan con '.' o '$'
            if os.path.isdir(item_path) and not item.startswith('.') and not item.startswith('$'):
                subdirs.append({
                    "name": item,
                    "path": item_path.replace("\\", "/") # Normalizar a forward slashes para evitar problemas de escape en JS
                })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"No se pudo acceder a la carpeta: {str(e)}")
        
    # Determinar el padre
    parent_path = os.path.dirname(current_path)
    if parent_path == current_path: # Llegamos a la raíz
        parent_path = ""
        
    return {
        "current_path": current_path.replace("\\", "/"),
        "parent_path": parent_path.replace("\\", "/") if parent_path else ("/" if os.name == 'nt' else ""),
        "subdirectories": sorted(subdirs, key=lambda x: x["name"].lower()),
        "is_root": False
    }

