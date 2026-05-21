/* app.js — Router SPA principal */

Auth.guard();  // Redirige a login si no hay token

const PAGES = {
  dashboard:  { module: DashboardPage,  title: 'Dashboard',   sub: 'Resumen general' },
  attendance: { module: AttendancePage, title: 'Asistencia',  sub: 'Registros del dispositivo' },
  employees:  { module: EmployeesPage,  title: 'Empleados',   sub: 'Gestión de personal' },
  parameters: { module: ParametersPage, title: 'Parámetros',  sub: 'Configuración de departamentos, cargos y horarios' },
  reports:    { module: ReportsPage,    title: 'Reportes',    sub: 'Exportar datos' },
  device:     { module: DevicePage,     title: 'Dispositivo', sub: 'DS-K1T323MBWX' },
  users:      { module: UsersPage,      title: 'Usuarios',    sub: 'Gestionar administradores' },
};

let currentPage = 'dashboard';
let devicePollInterval = null;

function navigate(page) {
  if (!PAGES[page]) return;

  // Control de accesos en el frontend
  const user = Auth.user();
  if ((page === 'users' || page === 'device') && user?.role !== 'admin') {
    page = 'dashboard';
  }

  currentPage = page;

  // Actualizar nav activo
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById(`nav-${page}`)?.classList.add('active');

  // Actualizar topbar
  document.getElementById('topbarTitle').textContent   = PAGES[page].title;
  document.getElementById('topbarSubtitle').textContent = PAGES[page].sub;

  // Renderizar página
  const contentEl = document.getElementById('pageContent');
  contentEl.classList.remove('page-fade-in');
  PAGES[page].module.render();
  void contentEl.offsetWidth; // Force reflow
  contentEl.classList.add('page-fade-in');
}

// ── Sidebar nav ──────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-item[data-page]').forEach(el => {
  el.addEventListener('click', () => navigate(el.dataset.page));
});

// ── Logout ───────────────────────────────────────────────────────────────────
document.getElementById('logoutBtn').addEventListener('click', () => {
  if (confirm('¿Cerrar sesión?')) Auth.logout();
});

// ── Sync button en topbar ────────────────────────────────────────────────────
document.getElementById('syncBtn').addEventListener('click', async () => {
  const btn = document.getElementById('syncBtn');
  btn.disabled = true; btn.textContent = '⟳ Syncing...';
  try {
    await API.post('/api/device/sync', {});
    Toast.show('Sincronización iniciada', 'info');
  } catch(e) { Toast.show(e.message, 'error'); }
  setTimeout(() => { btn.disabled = false; btn.textContent = '⟳ Sync'; }, 3000);
});

// ── Modal close ──────────────────────────────────────────────────────────────
document.getElementById('modalClose').addEventListener('click', Modal.close);
document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modalOverlay')) Modal.close();
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
}

// ── Device badge en topbar ───────────────────────────────────────────────────
async function updateDeviceBadge() {
  try {
    const s = await API.get('/api/device/status');
    const badge = document.getElementById('deviceBadge');
    const text  = document.getElementById('deviceBadgeText');
    badge.className = 'device-badge';
    if (s.is_online) {
      badge.classList.add('online'); text.textContent = 'Dispositivo en línea';
    } else {
      badge.classList.add('mock'); text.textContent = 'Modo simulado';
    }
  } catch(e) {}
}

// ── Init ─────────────────────────────────────────────────────────────────────
loadUserInfo();
updateDeviceBadge();
navigate('dashboard');

// Actualizar badge cada 60 seg
devicePollInterval = setInterval(updateDeviceBadge, 60000);
