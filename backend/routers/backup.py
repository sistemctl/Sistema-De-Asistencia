import os
import subprocess
import datetime
import zipfile
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from backend.database import get_db
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
    host = DB_HOST
    port = DB_PORT
    name = DB_NAME
    user = DB_USER
    password = DB_PASSWORD
    
    timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_sql = f"database_{timestamp}.sql"
    backup_zip = f"backup_full_{timestamp}.zip"
    
    env = os.environ.copy()
    env["PGPASSWORD"] = password
    
    cmd = [
        find_pg_binary("pg_dump"),
        "-h", host,
        "-p", port,
        "-U", user,
        "-d", name,
        "-F", "c",
        "-b",
        "-v",
        "-f", backup_sql
    ]
    
    try:
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        if result.returncode != 0:
            # Fallback a texto plano
            cmd_plain = [
                find_pg_binary("pg_dump"),
                "-h", host,
                "-p", port,
                "-U", user,
                "-d", name,
                "-f", backup_sql
            ]
            result_plain = subprocess.run(cmd_plain, env=env, capture_output=True, text=True)
            if result_plain.returncode != 0:
                raise Exception(result_plain.stderr or "Error al ejecutar pg_dump")
                
        # Empaquetar SQL y la carpeta uploads
        with zipfile.ZipFile(backup_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
            zipf.write(backup_sql, arcname=backup_sql)
            
            uploads_dir = os.path.abspath("uploads")
            if os.path.exists(uploads_dir):
                for root, _, files in os.walk(uploads_dir):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.join("uploads", os.path.relpath(file_path, uploads_dir))
                        zipf.write(file_path, arcname=arcname)
                
        def iterfile():
            with open(backup_zip, mode="rb") as f:
                yield from f
            try:
                os.remove(backup_sql)
                os.remove(backup_zip)
            except Exception:
                pass
                
        from backend.services.audit import log_action
        log_action(db, current_user.id, "EXPORT", "Database", "0", "Copia de seguridad completa descargada")

        return StreamingResponse(
            iterfile(), 
            media_type="application/zip", 
            headers={"Content-Disposition": f"attachment; filename={backup_zip}"}
        )
    except Exception as e:
        for f in [backup_sql, backup_zip]:
            if os.path.exists(f):
                try: os.remove(f)
                except Exception: pass
        raise HTTPException(status_code=500, detail=f"Error al generar backup: {str(e)}")

@router.post("/restore")
async def restore_backup(
    file: UploadFile = File(...),
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
        db = SessionLocal()
        from backend.services.audit import log_action
        log_action(db, current_user.id, "RESTORE", "Database", "0", "Base de datos e imágenes restauradas desde copia de seguridad")
        db.close()
        
        return {"status": "success", "message": "Sistema restaurado correctamente (Base de datos e imágenes)."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al restaurar: {str(e)}")
    finally:
        if os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
            except Exception:
                pass
