# Guía de Actualización a la Versión 2.5 🚀

Esta guía contiene los pasos necesarios para actualizar el **Sistema de Asistencia** a la **versión 2.5** en el entorno de producción.

---

## 📋 Resumen de Cambios en la v2.5
- **Modularización de CSS:** Arquitectura de estilos rediseñada para ser completamente modular (`main.css`, `tokens.css`, `components.css`, `layout.css`, etc.), eliminando la dependencia de hojas de estilo monolíticas (`styles.css` ha sido eliminado).
- **Soporte Nativo de Modo Oscuro:** Integración de un modo oscuro unificado y cohesivo, que puede activarse sin dependencias de terceros gracias al uso intensivo de variables CSS (`dark_mode.css`).
- **Correcciones Visuales (SMTP y Toggles):** Solucionados los problemas de superposición y layout de los selectores tipo interruptor (`toggle-switch`) en el módulo de configuración de SMTP y ajustes del sistema.
- **Mejoras de Íconos:** Renovación y optimización en la carga de íconos para mejorar su aspecto en toda la plataforma.

---

## 🛠️ Pasos para Actualizar en Producción

### Paso 1: Obtener el Código de la Rama `2.5`
En el servidor de producción, navega al directorio del proyecto y cambia a la rama `2.5`:

```bash
# Obtener los últimos cambios del repositorio
git fetch origin

# Cambiar a la rama 2.5 y descargar la actualización
git checkout 2.5
git pull origin 2.5
```

---

### Paso 2: Actualizar Dependencias
En caso de haber actualizaciones de dependencias en `requirements.txt`:

```bash
# Activar entorno virtual (Linux)
source venv/bin/activate
# En Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt
```

---

### Paso 3: Limpieza de Caché del Cliente (Frontend) **[MUY IMPORTANTE]**
Dado que la arquitectura de archivos CSS ha cambiado drásticamente (archivos eliminados y nuevos archivos agregados), es indispensable realizar una recarga profunda en el navegador de los usuarios finales:
1. Pide a todos los administradores/usuarios que presionen **Ctrl + F5** (o **Cmd + Shift + R** en Mac) al entrar al sistema.
2. Esto forzará al navegador a descargar la nueva estructura de `main.css` y descartar la caché obsoleta.

---

### Paso 4: Reiniciar el Backend
Reinicia el servicio para asegurarte de que FastAPI sirva los nuevos archivos estáticos sin problemas:
- **Si usas Windows (start.bat o script de inicio):** Cierra la consola y vuelve a iniciar el servidor.
- **Si usas Linux (systemd):**
  ```bash
  sudo systemctl restart asistencia.service
  ```

¡La actualización a la versión 2.5 estará completada y la interfaz lucirá su nuevo diseño modularizado y libre de errores!
