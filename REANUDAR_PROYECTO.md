# 📋 Sistema de Control de Asistencia — DS-K1T323MBWX
## Punto de Reanudación del Proyecto

**Fecha de última actualización:** 2026-05-26  
**Estado:** ✅ EN EJECUCIÓN — Backend, Frontend y Analítica Unificada listos y corriendo en la versión **v1.9.0**.

---

## 🔖 Contexto del Proyecto

Desarrollo de un **software de control de asistencia** premium para el terminal biométrico **Hikvision DS-K1T323MBWX**.

### Sobre el dispositivo
| Característica | Detalle |
|---|---|
| Modelo | **Hikvision DS-K1T323MBWX** |
| Tipo | Terminal de acceso facial (Value Series) |
| Autenticación | Reconocimiento Facial + Tarjeta M1 |
| ⚠️ Importante | **NO tiene lector de huellas**. El modelo con huellas es el DS-K1T323**MBF**WX |
| Capacidad Rostros | 1,000 |
| Capacidad Tarjetas | 3,000 |
| Eventos almacenados | 150,000 |
| Conectividad | Ethernet 10/100 + Wi-Fi + Bluetooth |
| Protocolo API | **ISAPI** (HTTP REST + Digest Authentication) |

---

## 🎯 Requerimientos Confirmados (Completado)

1. **Ubicación:** 1 sola ubicación.
2. **Empleados:** Aproximadamente 100 empleados.
3. **Base de Datos:** PostgreSQL local (v16-18) base de datos `asistencia`.
4. **Sincronización:** Automática configurada a través de un scheduler interno.
5. **Autenticación UI:** Login de administrador e integraciones de roles (RBAC: Super Admin, Gestor RRHH, Auditor).
6. **Dispositivo:** IP configurada en red local (`192.168.4.137` / `admin`).
7. **Horarios Flexibles:** Soporte para jornadas Continuas y Partidas (con control de almuerzo).
8. **Analítica Unificada:** Dashboard interactivo e intuitivo sincronizado con descargas en un clic.

---

## 🏗️ Arquitectura Implementada

```
Frontend Web (HTML + CSS + JS) -> Dashboard Unificado & Reportes Interactivos
        │  HTTP REST (JWT Bearer Auth)
Backend Python FastAPI (puerto 8000)
   ├── PostgreSQL Database (SQLAlchemy ORM + psycopg)
   └── Hikvision ISAPI Client (Digest Auth)
           │  HTTP ISAPI
     DS-K1T323MBWX Terminal
```

### Stack Tecnológico
| Capa | Tecnología |
|---|---|
| Frontend | HTML5 + CSS3 (dark mode premium Glassmorphism) + JavaScript ES6+ + Flatpickr + Chart.js |
| Backend | Python 3.11+ + FastAPI + Uvicorn |
| Base de datos | PostgreSQL (via SQLAlchemy ORM + `psycopg`) |
| Comunicación dispositivo | `requests` + HTTPDigestAuth (ISAPI) |
| Exportación | `openpyxl` (Excel) + `reportlab` (PDF) |

---

## 🗃️ Estructura de la Base de Datos

El sistema maneja un esquema robusto en PostgreSQL:
- **`users`**: Administradores del sistema web (roles: `admin`, `hr_admin`, `viewer`).
- **`departments`**: Áreas de la empresa.
- **`positions`** *(Nuevo)*: Cargos de la empresa relacionados formalmente.
- **`schedules`** *(Nuevo)*: Horarios de trabajo asignados (`continuous` o `split` con control de almuerzo).
- **`employees`**: Ficha del personal (enlazado a departamento, cargo y horario).
- **`attendance_records`**: Eventos importados del biométrico (evalúa de forma inteligente tardanzas y marcas faltantes).
- **`device_config`**: Parámetros editables del dispositivo biométrico y tolerancias de ingreso/egreso.
- **`sync_logs`**: Registro histórico de sincronizaciones.

---

## 🚀 Fases de Implementación Actualizadas

- [x] **Fase 1** — Backend + Base de datos (FastAPI, PostgreSQL, modelos). *¡Completado!*
- [x] **Fase 2** — Integración ISAPI con el dispositivo Hikvision. (Mock implementado para pruebas). *¡Completado!*
- [x] **Fase 3** — Frontend Web premium (dashboard, empleados, asistencia). *¡Completado!*
- [x] **Fase 4** — Horarios Flexibles y Cargos Estructurados (modelos, routers, vistas y scripts de migración). *¡Completado!*
- [x] **Fase 5** — Panel Unificado de Reportes y Analíticas de un solo clic (eliminación de controles redundantes, KPIs modernos y sincronización automática). *¡Completado!*

---

## 🏃‍♂️ Cómo arrancar el sistema

1. Asegurarse de que el servicio de PostgreSQL local esté corriendo.
2. Iniciar ejecutando el script (en Windows):
   ```cmd
   start.bat
   ```
3. Acceder al navegador:
   - URL: `http://localhost:8000/`
   - Usuario: `admin`
   - Contraseña: `admin123`

---

*Archivo actualizado automáticamente el 2026-05-26*
