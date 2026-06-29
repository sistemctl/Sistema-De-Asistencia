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
  system:     { module: SystemConfigPage,     title: 'Configuración del Sistema', sub: 'Personalización de marca y auditoría' },
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
      const subRoute = page.split('/')[1] || 'branding';
      PAGES[basePage].module.render(subRoute);
    } else if (basePage === 'device') {
      const subRoute = page.split('/')[1] || 'device_status';
      PAGES[basePage].module.render(subRoute);
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
    } else if (basePage === 'system') {
      const subRoute = page.split('/')[1] || 'branding';
      SystemConfigPage.switchTab(subRoute);
    } else if (basePage === 'device') {
      const subRoute = page.split('/')[1] || 'device_status';
      DevicePage.switchTab(subRoute);
    }
  }
}

// ── Sidebar nav ──────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-item[data-page]').forEach(el => {
  el.addEventListener('click', () => {
    window.location.hash = el.dataset.page;
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      window.location.hash = el.dataset.page;
    }
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
// Use event listener on overlay but respect force-password lock
document.getElementById('modalOverlay').addEventListener('click', (e) => {
  const user = Auth.user();
  if (user && user.force_password_change) return; // Bloquear cierre si es obligatorio
  if (e.target === document.getElementById('modalOverlay')) Modal.close();
});

// ── Copy to Clipboard global helper with elastic tooltip ────────────────────
document.addEventListener('click', async (e) => {


  // Copy to clipboard
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
    window.currentBrandingData = data;
    
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
    const base = data.bg_base_color || '#f3f5fa';
    const surface = data.bg_surface_color || '#ffffff';
    const pColor = data.primary_color || '#1d4ed8';
    const aColor = data.accent_color || '#0a1020';

    applyThemeColors(pColor, aColor, base, surface, data.button_style || 'rounded', data.sidebar_style || 'dark');

    // Actualizar favicon de la pestaña del navegador
    updateFavicon(data.logo_path, pColor, data.system_name);
  } catch(e) {
    console.error('Error al cargar branding', e);
  }
}

// Función para aplicar colores de tema en tiempo real
function applyThemeColors(pColor, aColor, base, surface, buttonStyle = 'rounded', sidebarStyle = 'dark') {
  // Aplicar estilos de botones/bordes y de barra lateral
  document.documentElement.setAttribute('data-button-style', buttonStyle);
  document.documentElement.setAttribute('data-sidebar-style', sidebarStyle);

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

  // Si está activo el modo oscuro, no inyectamos los colores de fondo/superficie/texto claros como inline-styles,
  // permitiendo que apliquen los estilos de dark_mode.css
  if (document.documentElement.classList.contains('dark-theme')) {
    const propsToRemove = [
      '--bg-base', '--bg-raised', '--surface-1', '--surface-2', '--surface-3',
      '--text-1', '--text-2', '--text-3',
      '--border', '--border-light'
    ];
    propsToRemove.forEach(prop => document.documentElement.style.removeProperty(prop));
    document.body.style.backgroundImage = 'none';
    return;
  }

  // Modo claro: shell blanco fijo; el branding solo afecta acento y fondo sutil
  const lightBase = base && getBrightness(base) >= 210 ? base : '#f7f8fb';
  document.documentElement.style.setProperty('--bg-base', lightBase);
  document.documentElement.style.setProperty('--bg-raised', '#ffffff');
  document.documentElement.style.setProperty('--surface-1', '#ffffff');
  document.documentElement.style.setProperty('--surface-2', '#f4f6fa');
  document.documentElement.style.setProperty('--surface-3', '#e9edf4');
  document.documentElement.style.setProperty('--text-1', '#0f172a');
  document.documentElement.style.setProperty('--text-2', '#475569');
  document.documentElement.style.setProperty('--text-3', '#94a3b8');
  document.documentElement.style.setProperty('--border', 'rgba(15, 23, 42, 0.08)');
  document.documentElement.style.setProperty('--border-light', 'rgba(15, 23, 42, 0.12)');

  document.body.style.backgroundImage = `radial-gradient(circle at 10% 20%, rgba(${pRgb || '37, 99, 235'}, 0.025) 0%, ${lightBase} 100%)`;
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
  } catch(e) { console.warn(e); }
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

// ── Soporte de Tema Oscuro (Dark Mode) ──────────────────────────────────────────
function initTheme() {
  const toggleBtn = document.getElementById('themeToggleBtn');
  if (!toggleBtn) return;

  const currentTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  
  if (currentTheme === 'dark') {
    document.documentElement.classList.add('dark-theme');
    document.body.classList.add('dark-theme');
    toggleBtn.innerHTML = Icons.sun(16, 16);
  } else {
    document.documentElement.classList.remove('dark-theme');
    document.body.classList.remove('dark-theme');
    toggleBtn.innerHTML = Icons.moon(16, 16);
  }

  toggleBtn.addEventListener('click', () => {
    const isDark = document.documentElement.classList.contains('dark-theme');
    if (isDark) {
      document.documentElement.classList.remove('dark-theme');
      document.body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
      toggleBtn.innerHTML = Icons.moon(16, 16);
    } else {
      document.documentElement.classList.add('dark-theme');
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
      toggleBtn.innerHTML = Icons.sun(16, 16);
    }
    
    // Volver a evaluar colores de branding con el nuevo estado del tema
    if (window.currentBrandingData) {
      const d = window.currentBrandingData;
      applyThemeColors(d.primary_color, d.accent_color, d.bg_base_color, d.bg_surface_color);
    }
  });
}

// ── Init ─────────────────────────────────────────────────────────────────────
loadUserInfo();
initTheme();
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

// Comprobar si necesita cambiar la contraseña
const currentUser = Auth.user();
if (currentUser && currentUser.force_password_change) {
  setTimeout(() => {
    Modal.open('Cambio de Contraseña Obligatorio', `
      <p style="color:var(--text-2);font-size:.875rem;margin-bottom:14px">Por razones de seguridad, debes actualizar tu contraseña antes de continuar.</p>
      <div class="field" style="margin-bottom:12px;">
        <label>Nueva Contraseña</label>
        <input id="forcedNewPassword" type="password" placeholder="Mínimo 8 caracteres (A-Z, a-z, 0-9, símbolos)" />
      </div>
      <div class="field">
        <label>Confirmar Contraseña</label>
        <input id="forcedConfirmPassword" type="password" placeholder="Repita la nueva contraseña" />
      </div>
      <div style="font-size:0.75rem; color:var(--text-3); margin-top: 8px;">
        La contraseña debe tener al menos 8 caracteres, incluyendo mayúsculas, minúsculas, números y caracteres especiales.
      </div>
    `, `<button class="btn btn-primary" id="btnForcePwdSave" style="width:100%">Guardar Contraseña</button>`);
    
    const closeBtn = document.getElementById('modalClose');
    if (closeBtn) closeBtn.style.display = 'none';
    
    // Deshabilitar click afuera (modificando evento o previniendo propagación)
    document.getElementById('modalBox').addEventListener('click', (e) => e.stopPropagation());
    // Se sobreescribe el onclick temporalmente
    const oldOverlayClick = document.getElementById('modalOverlay').onclick;
    document.getElementById('modalOverlay').onclick = null;

    document.getElementById('btnForcePwdSave').onclick = async () => {
      const pwd = document.getElementById('forcedNewPassword').value;
      const confirm = document.getElementById('forcedConfirmPassword').value;
      if (pwd !== confirm) { Toast.show('Las contraseñas no coinciden', 'warning'); return; }
      if (pwd.length < 8) { Toast.show('La contraseña debe tener al menos 8 caracteres', 'warning'); return; }
      if (!/(?=.*[a-z])/.test(pwd)) { Toast.show('La contraseña debe contener al menos una minúscula', 'warning'); return; }
      if (!/(?=.*[A-Z])/.test(pwd)) { Toast.show('La contraseña debe contener al menos una mayúscula', 'warning'); return; }
      if (!/(?=.*\d)/.test(pwd)) { Toast.show('La contraseña debe contener al menos un número', 'warning'); return; }
      if (!/(?=.*[\W_])/.test(pwd)) { Toast.show('La contraseña debe contener al menos un carácter especial', 'warning'); return; }

      try {
        document.getElementById('btnForcePwdSave').classList.add('btn-loading');
        await API.put('/api/auth/users/' + currentUser.id, { password: pwd, force_password_change: false });
        
        currentUser.force_password_change = false;
        localStorage.setItem('user', JSON.stringify(currentUser));
        
        Toast.show('Contraseña actualizada correctamente.', 'success');
        if (closeBtn) closeBtn.style.display = 'block';
        Modal.close();
      } catch(e) {
        document.getElementById('btnForcePwdSave').classList.remove('btn-loading');
        Toast.show(e.message, 'error');
      }
    };
  }, 500); // Dar tiempo a que renderice la app
}

