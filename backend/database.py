"""
Configuración de SQLAlchemy con PostgreSQL: engine, sesión y Base declarativa.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from backend.config import DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,       # Verifica la conexión antes de usarla
    pool_size=10,             # Conexiones simultáneas al pool
    max_overflow=20,          # Conexiones extra en picos
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """Dependency de FastAPI: provee una sesión de BD y la cierra al terminar."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Crea todas las tablas si no existen y siembra datos iniciales."""
    from backend import models  # noqa: F401 — importar para registrar los modelos
    Base.metadata.create_all(bind=engine)
    _seed_initial_data()


def _seed_initial_data():
    """Crea el usuario admin, la config del dispositivo y del sistema si no existen."""
    from backend.models import User, DeviceConfig, Department, SystemConfig
    from backend.auth import get_password_hash
    from backend.config import (
        DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD,
        DEVICE_IP, DEVICE_PORT, DEVICE_USERNAME, DEVICE_PASSWORD,
        SYNC_INTERVAL_MINUTES,
    )

    db = SessionLocal()
    try:
        # Usuario admin
        if not db.query(User).filter(User.username == DEFAULT_ADMIN_USERNAME).first():
            db.add(User(
                username=DEFAULT_ADMIN_USERNAME,
                hashed_password=get_password_hash(DEFAULT_ADMIN_PASSWORD),
                full_name="Administrador",
                role="admin",
                is_active=True,
            ))
            print(f"Admin creado: {DEFAULT_ADMIN_USERNAME} / {DEFAULT_ADMIN_PASSWORD}")

        # Configuración del dispositivo
        device_cfg = db.query(DeviceConfig).first()
        if not device_cfg:
            db.add(DeviceConfig(
                ip_address=DEVICE_IP,
                port=DEVICE_PORT,
                username=DEVICE_USERNAME,
                password=DEVICE_PASSWORD,
                sync_interval_minutes=SYNC_INTERVAL_MINUTES,
            ))
            print(f"Config dispositivo creada: {DEVICE_IP}:{DEVICE_PORT}")
        else:
            if device_cfg.password == "admin123" and DEVICE_PASSWORD != "admin123":
                device_cfg.password = DEVICE_PASSWORD
                print("Config dispositivo actualizada desde .env con nueva contraseña")

        # Configuración del sistema por defecto
        if not db.query(SystemConfig).first():
            db.add(SystemConfig(
                system_name="Control de Asistencia",
                company_name="Hikvision DS-K1T323MBWX",
                primary_color="#4f46e5",
                accent_color="#7c3aed",
                work_days="1,2,3,4,5",
                time_format="24h",
                entry_tolerance_minutes=10,
            ))
            print("Configuracion de sistema inicial creada")

        # Departamento por defecto
        if not db.query(Department).first():
            db.add(Department(name="General", description="Departamento por defecto"))

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error en seed inicial: {e}")
    finally:
        db.close()


