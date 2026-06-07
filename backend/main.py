"""
Punto de entrada principal de la API FastAPI.
Sistema de Control de Asistencia — Hikvision DS-K1T323MBWX
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.config import APP_NAME, APP_VERSION, CORS_ORIGINS, FRONTEND_DIR
from backend.database import init_db
from backend.services.scheduler import start_scheduler, stop_scheduler
from backend.routers import auth, employees, attendance, device, dashboard, reports, schedules, settings, daily_schedules, holidays, leaves, audit, backup


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Eventos de inicio y apagado de la aplicación."""
    logger.info(f"🚀 Iniciando {APP_NAME} v{APP_VERSION}")
    
    import asyncio
    from backend.routers import ws
    ws.main_loop = asyncio.get_running_loop()
    
    init_db()
    start_scheduler()
    logger.info("✅ Sistema listo")
    yield
    logger.info("🛑 Deteniendo scheduler...")
    stop_scheduler()


app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description="API REST para el sistema de control de asistencia con Hikvision DS-K1T323MBWX",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(daily_schedules.router)
app.include_router(employees.router)
app.include_router(schedules.router)
app.include_router(attendance.router)
app.include_router(device.router)
app.include_router(dashboard.router)
app.include_router(reports.router)
app.include_router(settings.router)
app.include_router(holidays.router)
app.include_router(leaves.router)
app.include_router(audit.router)
app.include_router(backup.router)
from backend.routers import ws
app.include_router(ws.router)


# ── Archivos estáticos del frontend ──────────────────────────────────────────
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR / "css")), name="static-css")
    app.mount("/js", StaticFiles(directory=str(FRONTEND_DIR / "js")), name="static-js")
    app.mount("/uploads", StaticFiles(directory=str(FRONTEND_DIR.parent / "uploads")), name="uploads")

    @app.get("/", include_in_schema=False)
    def serve_login():
        response = FileResponse(str(FRONTEND_DIR / "index.html"))
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response

    @app.get("/app", include_in_schema=False)
    def serve_app():
        response = FileResponse(str(FRONTEND_DIR / "app.html"))
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response

    @app.get("/favicon.svg", include_in_schema=False)
    def serve_favicon_svg():
        return FileResponse(str(FRONTEND_DIR / "favicon.svg"), media_type="image/svg+xml")

    @app.get("/static/favicon.svg", include_in_schema=False)
    def serve_favicon_static():
        return FileResponse(str(FRONTEND_DIR / "favicon.svg"), media_type="image/svg+xml")

    @app.get("/manifest.json", include_in_schema=False)
    def serve_manifest():
        return FileResponse(str(FRONTEND_DIR / "manifest.json"), media_type="application/json")

    @app.get("/sw.js", include_in_schema=False)
    def serve_sw():
        return FileResponse(str(FRONTEND_DIR / "sw.js"), media_type="application/javascript")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": APP_NAME, "version": APP_VERSION}
