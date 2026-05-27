from backend.database import engine, Base, init_db
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("reset_db")

def reset_database():
    print("🗑️  Eliminando tablas existentes...")
    from backend import models  # Asegurar que los modelos estén cargados
    Base.metadata.drop_all(bind=engine)
    print("✅ Tablas eliminadas")
    
    print("🏗️  Creando nuevas tablas e inicializando datos...")
    init_db()
    print("✨ Base de datos reseteada con éxito para la versión 1.9")

if __name__ == "__main__":
    try:
        reset_database()
    except Exception as e:
        print(f"❌ Error al resetear la base de datos: {e}")
