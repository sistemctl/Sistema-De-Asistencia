import os
import subprocess
import datetime
import zipfile
import shutil
import logging
from backend.config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

logger = logging.getLogger("backup_service")

def find_pg_binary(binary_name: str) -> str:
    path = shutil.which(binary_name)
    if path:
        return path
        
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

def create_backup_zip(destination_dir: str) -> str:
    """
    Genera un respaldo de la base de datos PostgreSQL y la carpeta uploads.
    Crea un archivo ZIP en destination_dir y retorna su ruta absoluta.
    """
    os.makedirs(destination_dir, exist_ok=True)
    
    timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_sql = f"database_{timestamp}.sql"
    backup_zip = os.path.join(destination_dir, f"backup_full_{timestamp}.zip")
    
    env = os.environ.copy()
    env["PGPASSWORD"] = DB_PASSWORD
    
    # Intentar formato custom con pg_dump -F c
    cmd = [
        find_pg_binary("pg_dump"),
        "-h", DB_HOST,
        "-p", DB_PORT,
        "-U", DB_USER,
        "-d", DB_NAME,
        "-F", "c",
        "-b",
        "-v",
        "-f", backup_sql
    ]
    
    try:
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        if result.returncode != 0:
            # Fallback a texto plano
            logger.warning("pg_dump -F c falló. Intentando fallback a texto plano...")
            cmd_plain = [
                find_pg_binary("pg_dump"),
                "-h", DB_HOST,
                "-p", DB_PORT,
                "-U", DB_USER,
                "-d", DB_NAME,
                "-f", backup_sql
            ]
            result_plain = subprocess.run(cmd_plain, env=env, capture_output=True, text=True)
            if result_plain.returncode != 0:
                raise Exception(result_plain.stderr or "Error al ejecutar pg_dump")
                
        # Empaquetar el SQL y la carpeta uploads en el archivo ZIP final
        with zipfile.ZipFile(backup_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
            zipf.write(backup_sql, arcname=backup_sql)
            
            uploads_dir = os.path.abspath("uploads")
            if os.path.exists(uploads_dir):
                for root, _, files in os.walk(uploads_dir):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.join("uploads", os.path.relpath(file_path, uploads_dir))
                        zipf.write(file_path, arcname=arcname)
                        
        logger.info(f"Copia de seguridad creada con éxito: {backup_zip}")
        return os.path.abspath(backup_zip)
    except Exception as e:
        logger.error(f"Error generando copia de seguridad: {e}")
        if os.path.exists(backup_zip):
            try: os.remove(backup_zip)
            except Exception: pass
        raise e
    finally:
        if os.path.exists(backup_sql):
            try: os.remove(backup_sql)
            except Exception: pass

def cleanup_old_backups(backup_dir: str, keep_count: int):
    """
    Lista todos los respaldos en backup_dir y conserva únicamente los keep_count más recientes.
    Elimina los respaldos más antiguos.
    """
    if not os.path.exists(backup_dir):
        return
        
    # Obtener todos los archivos que coinciden con el patrón backup_full_*.zip
    files = [
        os.path.join(backup_dir, f) 
        for f in os.listdir(backup_dir) 
        if f.startswith("backup_full_") and f.endswith(".zip")
    ]
    
    # Si tenemos más archivos que el límite de retención, eliminamos los más antiguos
    if len(files) > keep_count:
        # Ordenar por fecha de modificación (los más viejos primero)
        files.sort(key=os.path.getmtime)
        to_delete = files[:len(files) - keep_count]
        
        for f in to_delete:
            try:
                os.remove(f)
                logger.info(f"Respaldo antiguo eliminado por retención rodante: {f}")
            except Exception as e:
                logger.error(f"No se pudo eliminar el respaldo antiguo {f}: {e}")
