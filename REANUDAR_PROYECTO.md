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
- [x] **Fase 5** — Panel Unificado de Reportes y Analíticas (despliegue de métricas en modales y selector de columnas en reportes). *¡Completado!*
- [x] **Fase 6** — Acciones en Lote (Bulk Actions) y Reorganización del Proyecto (estructura unificada y CLI manage.py). *¡Completado!*

---

## 📁 Nueva Estructura Organizativa del Proyecto

Para mantener el código limpio y profesional, hemos organizado el proyecto agrupando los scripts sueltos en carpetas específicas:
- **`backend/`**: Servidor FastAPI (routers, base de datos, modelos, esquemas, servicios de Hikvision y reportes).
- **`frontend/`**: Interfaz de usuario (HTML, estilos css y scripts js independientes por módulo).
- **`migrations/`**: Directorio con todos los scripts de migración secuenciales de base de datos.
- **`scripts/`**: Utilidades administrativas y de inicialización del sistema.
- **`tests/`**: Pruebas y diagnósticos de red/cálculo.
- **`manage.py`**: Interfaz CLI unificada del proyecto para no interactuar con scripts sueltos directamente.

---

## 🏃‍♂️ Cómo usar el sistema y herramientas administrativas

### 1. Iniciar la aplicación
Puedes iniciar la aplicación usando el script automático en Windows:
```cmd
start.bat
```
*(Nota: Internamente invoca `python manage.py runserver`).*

### 2. Comandos Administrativos (Línea de Comandos)
El proyecto incluye un gestor administrativo centralizado (`manage.py`). Ejecútalo desde el directorio raíz utilizando el entorno virtual activo:

* **Iniciar servidor FastAPI**:
  ```bash
  python manage.py runserver
  ```
* **Crear base de datos PostgreSQL**:
  ```bash
  python manage.py create-db
  ```
* **Recrear base de datos y tablas**:
  ```bash
  python manage.py reset-db
  ```
* **Sembrar datos de prueba**:
  ```bash
  python manage.py seed-db
  ```
* **Ejecutar todas las migraciones del sistema en orden**:
  ```bash
  python manage.py migrate
  ```
* **Diagnosticar conexión y logs del biométrico**:
  ```bash
  python manage.py check-sync
  ```
* **Ejecutar batería de pruebas y diagnósticos**:
  ```bash
  python manage.py test
  ```

---

## 🔑 Credenciales de Acceso
- **URL**: `http://localhost:8000/`
- **Usuario de administración**: `admin`
- **Contraseña**: `admin123`

---

*Archivo actualizado automáticamente el 2026-05-31*

