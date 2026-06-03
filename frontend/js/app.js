/* app.js — Router SPA principal */

Auth.guard();  // Redirige a login si no hay token

const PAGES = {
  dashboard:  { module: DashboardPage,  title: 'Dashboard',   sub: 'Resumen general' },
  attendance: { module: AttendancePage, title: 'Asistencia',  sub: 'Registros del dispositivo' },
  employees:  { module: EmployeesPage,  title: 'Empleados',   sub: 'Gestión de personal' },
  leaves:     { module: LeavesPage,     title: 'Novedades',   sub: 'Gestión de incapacidades, vacaciones y licencias' },
  parameters: { module: ParametersPage, title: 'Parámetros',  sub: 'Configuración de departamentos, cargos y horarios' },
  reports:    { module: ReportsPage,    title: 'Reportes',    sub: 'Exportar datos' },
  device:     { module: DevicePage,     title: 'Dispositivo', sub: 'DS-K1T323MBWX' },
  system:     { module: DevicePage,     title: 'Configuración del Sistema', sub: 'Personalización de marca y branding' },
  users:      { module: UsersPage,      title: 'Usuarios',    sub: 'Gestionar administradores' },
};

let currentPage = '';
let devicePollInterval = null;

function navigate(page) {
  // Extraer la página base si tiene sufijos de sub-ruta (ej: reports/records -> reports)
  const basePage = page.split('/')[0];
  if (!PAGES[basePage]) return;

  // Control de accesos en el frontend
  const user = Auth.user();
  if ((basePage === 'users' || basePage === 'device' || basePage === 'system') && user?.role !== 'admin') {
    page = 'dashboard';
  }

  const previousBasePage = currentPage.split('/')[0];
  currentPage = page;

  // Sincronizar el hash de la URL si es diferente
  if (window.location.hash !== '#' + page) {
    window.location.hash = page;
  }

  // Actualizar nav activo
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById(`nav-${basePage}`)?.classList.add('active');

  // Actualizar topbar
  const topbarTitle = document.getElementById('topbarTitle');
  const topbarSubtitle = document.getElementById('topbarSubtitle');
  if (topbarTitle) topbarTitle.textContent = PAGES[basePage].title;
  if (topbarSubtitle) topbarSubtitle.textContent = PAGES[basePage].sub;

  // Renderizar página
  const contentEl = document.getElementById('pageContent');
  if (basePage !== previousBasePage) {
    contentEl.classList.remove('page-fade-in');
    if (basePage === 'system') {
      PAGES[basePage].module.render('branding');
    } else if (basePage === 'device') {
      PAGES[basePage].module.render('device_status');
    } else {
      PAGES[basePage].module.render();
    }
    void contentEl.offsetWidth; // Force reflow
    contentEl.classList.add('page-fade-in');
  } else {
    // Si la página base es la misma (ej. reports), delegar al submódulo para cambiar de pestaña/vista sin recrear el DOM
    if (basePage === 'reports') {
      const subRoute = page.split('/')[1] || 'analytics';
      ReportsPage.switchReportTab(subRoute);
    }
  }
}

// ── Sidebar nav ──────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-item[data-page]').forEach(el => {
  el.addEventListener('click', () => {
    window.location.hash = el.dataset.page;
  });
});

// Listener global para cambios de hash
window.addEventListener('hashchange', () => {
  const page = window.location.hash.slice(1);
  const basePage = page.split('/')[0];
  const currentBase = currentPage.split('/')[0];
  if (page && PAGES[basePage] && (page !== currentPage || basePage !== currentBase)) {
    navigate(page);
  }
});

// ── Logout ───────────────────────────────────────────────────────────────────
document.getElementById('logoutBtn').addEventListener('click', () => {
  Modal.confirm(
    '¿Cerrar Sesión?',
    '¿Estás seguro de que deseas salir del sistema? Tendrás que volver a ingresar tus credenciales para acceder.',
    () => Auth.logout(),
    'warning'
  );
});

// ── Sync button en topbar ────────────────────────────────────────────────────
const syncBtn = document.getElementById('syncBtn');
if (syncBtn) {
  syncBtn.addEventListener('click', async () => {
    syncBtn.disabled = true; syncBtn.textContent = '⟳ Syncing...';
    try {
      await API.post('/api/device/sync', {});
      Toast.show('Sincronización iniciada', 'info');
    } catch(e) { Toast.show(e.message, 'error'); }
    setTimeout(() => { syncBtn.disabled = false; syncBtn.textContent = '⟳ Sync'; }, 3000);
  });
}

// ── Modal close ──────────────────────────────────────────────────────────────
document.getElementById('modalClose').addEventListener('click', Modal.close);
document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modalOverlay')) Modal.close();
});

// ── Copy to Clipboard global helper with elastic tooltip ────────────────────
document.addEventListener('click', async (e) => {
  const copyEl = e.target.closest('.copyable');
  if (!copyEl) return;

  const textToCopy = copyEl.getAttribute('data-copy') || copyEl.innerText.trim();
  if (!textToCopy) return;

  try {
    await navigator.clipboard.writeText(textToCopy);
    
    // Remover tooltip anterior si existe
    const existingTooltip = copyEl.querySelector('.copy-tooltip');
    if (existingTooltip) existingTooltip.remove();

    // Crear tooltip flotante elástico
    const tooltip = document.createElement('span');
    tooltip.className = 'copy-tooltip';
    tooltip.innerText = '¡Copiado!';
    
    // Asegurar posicionamiento relativo del padre
    const originalPosition = window.getComputedStyle(copyEl).position;
    if (originalPosition === 'static') {
      copyEl.style.position = 'relative';
    }

    copyEl.appendChild(tooltip);

    // Auto-eliminar tooltip al terminar animación
    setTimeout(() => {
      tooltip.remove();
      if (originalPosition === 'static') {
        copyEl.style.position = '';
      }
    }, 600);
  } catch (err) {
    console.error('Fallo al copiar texto: ', err);
  }
});

// ── User info en sidebar ─────────────────────────────────────────────────────
function loadUserInfo() {
  const user = Auth.user();
  if (!user) return;
  document.getElementById('userName').textContent  = user.full_name;
  
  const roleLabels = { admin: 'Super Admin', hr_admin: 'Gestor RRHH', viewer: 'Auditor' };
  document.getElementById('userRole').textContent  = roleLabels[user.role] || user.role;
  document.getElementById('userAvatar').textContent = user.full_name.charAt(0).toUpperCase();

  // Mostrar menú de usuarios y dispositivo solo a Super Admins
  const navUsers = document.getElementById('nav-users');
  if (navUsers) {
    navUsers.style.display = user.role === 'admin' ? 'flex' : 'none';
  }
  const navDevice = document.getElementById('nav-device');
  if (navDevice) {
    navDevice.style.display = user.role === 'admin' ? 'flex' : 'none';
  }
  const navSystem = document.getElementById('nav-system');
  if (navSystem) {
    navSystem.style.display = user.role === 'admin' ? 'flex' : 'none';
  }
}

// ── Favicon dinámico circular ─────────────────────────────────────────────────
function updateFavicon(logoPath, primaryColor, systemName) {
  const faviconEl = document.getElementById('favicon');
  if (!faviconEl) return;

  const size = 64;

  if (logoPath) {
    // Recortar el logo en un círculo perfecto usando canvas
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      // Clip circular
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // Dibujar el logo centrado y cubriendo el círculo
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);

      faviconEl.href = canvas.toDataURL('image/png');
      faviconEl.type = 'image/png';
    };
    img.onerror = () => {
      // Si no se puede cargar (CORS u otro), usar directamente
      faviconEl.href = logoPath;
      faviconEl.type = 'image/png';
    };
    img.src = logoPath;
  } else {
    // Generar un favicon circular SVG con el color primario y la inicial del sistema
    const color = primaryColor || '#1e3a5f';
    const initial = (systemName || 'A').charAt(0).toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="16" fill="${color}"/>
  <text x="16" y="22" font-family="Arial, sans-serif" font-size="17" font-weight="bold" text-anchor="middle" fill="#ffffff">${initial}</text>
</svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    faviconEl.href = url;
    faviconEl.type = 'image/svg+xml';
  }
}

// Helper to convert HEX to RGB
function hexToRgb(hex) {
  if (!hex) return null;
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
}

// Helper to determine brightness (0-255)
function getBrightness(hex) {
  if (!hex) return 255;
  const rgb = hexToRgb(hex);
  if (!rgb) return 255;
  const parts = rgb.split(',').map(n => parseInt(n.trim(), 10));
  return (parts[0] * 299 + parts[1] * 587 + parts[2] * 114) / 1000;
}

// ── Branding del Sistema ──────────────────────────────────────────────────────
async function loadSystemBranding() {
  try {
    const data = await API.get('/api/settings');
    
    // Actualizar nombre de la pestaña/título
    document.title = data.system_name || 'Sistema de Asistencia';
    
    // Actualizar textos en sidebar
    const sysNameEl = document.getElementById('sidebarSystemName');
    const compNameEl = document.getElementById('sidebarCompanyName');
    if (sysNameEl) sysNameEl.textContent = data.system_name;
    if (compNameEl) compNameEl.textContent = data.company_name;
    
    // Actualizar logotipo en sidebar
    const logoSvg = document.getElementById('sidebarLogoSvg');
    const logoImg = document.getElementById('sidebarLogoImg');
    if (logoSvg && logoImg) {
      const brandIconContainer = document.getElementById('sidebarLogoContainer');
      if (data.logo_path) {
        logoSvg.style.display = 'none';
        logoImg.src = data.logo_path;
        logoImg.style.display = 'block';
        if (brandIconContainer) {
          brandIconContainer.style.background = 'none';
          brandIconContainer.style.boxShadow = 'none';
          brandIconContainer.style.width = '42px';
          brandIconContainer.style.height = '42px';
          brandIconContainer.style.borderRadius = '50%';
          brandIconContainer.style.overflow = 'hidden';

          logoImg.style.width = '100%';
          logoImg.style.height = '100%';
          logoImg.style.objectFit = 'cover';
          logoImg.style.maxWidth = '';
        }
      } else {
        logoSvg.style.display = 'block';
        logoImg.style.display = 'none';
        if (brandIconContainer) {
          brandIconContainer.style.background = '';
          brandIconContainer.style.boxShadow = '';
          brandIconContainer.style.width = '';
          brandIconContainer.style.height = '';
          brandIconContainer.style.borderRadius = '';
          brandIconContainer.style.overflow = '';
          logoImg.style.width = '';
          logoImg.style.height = '';
          logoImg.style.maxWidth = '';
          logoImg.style.objectFit = '';
        }
      }
    }
    
    // Inyectar colores de tema y fondos en el DOM
    const base = data.bg_base_color || '#f8fafc';
    const surface = data.bg_surface_color || '#ffffff';
    const pColor = data.primary_color || '#4f46e5';
    const aColor = data.accent_color || '#7c3aed';

    applyThemeColors(pColor, aColor, base, surface);

    // Actualizar favicon de la pestaña del navegador
    updateFavicon(data.logo_path, pColor, data.system_name);
  } catch(e) {
    console.error('Error al cargar branding', e);
  }
}

// Función para aplicar colores de tema en tiempo real
function applyThemeColors(pColor, aColor, base, surface) {
  // Inyectar variables base
  document.documentElement.style.setProperty('--bg-base', base);
  document.documentElement.style.setProperty('--bg-raised', surface);
  document.documentElement.style.setProperty('--surface-1', surface);
  
  // Mapear primario/acento y sus componentes RGB
  document.documentElement.style.setProperty('--accent', pColor);
  const pRgb = hexToRgb(pColor);
  if (pRgb) {
    document.documentElement.style.setProperty('--accent-rgb', pRgb);
    document.documentElement.style.setProperty('--border-glow', `rgba(${pRgb}, 0.08)`);
  }
  
  document.documentElement.style.setProperty('--accent-2', aColor);
  const aRgb = hexToRgb(aColor);
  if (aRgb) {
    document.documentElement.style.setProperty('--accent-2-rgb', aRgb);
  }

  // Calcular contraste según el brillo de las tarjetas (donde reside el texto)
  const brightness = getBrightness(surface);
  if (brightness < 135) {
    // Modo Oscuro Automático
    document.documentElement.style.setProperty('--text-1', '#f8fafc');
    document.documentElement.style.setProperty('--text-2', '#cbd5e1');
    document.documentElement.style.setProperty('--text-3', '#94a3b8');
    document.documentElement.style.setProperty('--border', '#334155');
    document.documentElement.style.setProperty('--border-light', '#475569');
    document.documentElement.style.setProperty('--surface-2', '#1e293b');
    document.documentElement.style.setProperty('--surface-3', '#334155');
  } else {
    // Modo Claro (Valores por defecto de styles.css)
    document.documentElement.style.setProperty('--text-1', '#0f172a');
    document.documentElement.style.setProperty('--text-2', '#334155');
    document.documentElement.style.setProperty('--text-3', '#64748b');
    document.documentElement.style.setProperty('--border', '#e2e8f0');
    document.documentElement.style.setProperty('--border-light', '#cbd5e1');
    document.documentElement.style.setProperty('--surface-2', '#f1f5f9');
    document.documentElement.style.setProperty('--surface-3', '#e2e8f0');
  }

  // Actualizar fondo gradiente radial decorativo
  document.body.style.backgroundImage = `radial-gradient(circle at 10% 20%, rgba(${pRgb || '79, 70, 229'}, 0.03) 0%, ${base} 100%)`;
}

// Exponer globalmente para que system_settings.js y device.js lo puedan invocar
window.loadSystemBranding = loadSystemBranding;
window.applyThemeColors = applyThemeColors;

// ── Device badge en topbar ───────────────────────────────────────────────────
async function updateDeviceBadge() {
  try {
    const s = await API.get('/api/device/status');
    const badge = document.getElementById('deviceBadge');
    const text  = document.getElementById('deviceBadgeText');
    if (!badge || !text) return;
    badge.className = 'device-badge';
    if (s.is_online) {
      badge.classList.add('online'); text.textContent = 'Dispositivo en línea';
    } else {
      badge.classList.add('mock'); text.textContent = 'Modo simulado';
    }
  } catch(e) {}
}

// ── Reloj en tiempo real ──────────────────────────────────────────────────────
function startClock() {
  const timeEl = document.getElementById('topbarClockTime');
  const dateEl = document.getElementById('topbarClockDate');
  if (!timeEl || !dateEl) return;

  const tick = () => {
    const now = new Date();
    // HH:MM:SS
    timeEl.textContent = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    // Lun 31 may
    dateEl.textContent = now.toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short' });
  };

  tick(); // inmediata
  setInterval(tick, 1000);
}

// ── Init ─────────────────────────────────────────────────────────────────────
loadUserInfo();
loadSystemBranding();
updateDeviceBadge();
startClock();

// Determinar la página inicial basada en el hash de la URL
const initialPage = window.location.hash.slice(1) || 'dashboard';
navigate(initialPage);

// Actualizar badge cada 60 seg
devicePollInterval = setInterval(() => {
  updateDeviceBadge();
}, 60000);

