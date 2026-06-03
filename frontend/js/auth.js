/* auth.js — Token management & API helper */

const API = {
  token: () => localStorage.getItem('token'),

  headers() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token()}` };
  },

  async get(path) {
    const r = await fetch(path, { headers: this.headers() });
    if (r.status === 401) { Auth.logout(); return null; }
    if (!r.ok) throw new Error((await r.json()).detail || 'Error');
    return r.json();
  },

  async post(path, body) {
    const r = await fetch(path, { method: 'POST', headers: this.headers(), body: JSON.stringify(body) });
    if (r.status === 401) { Auth.logout(); return null; }
    if (!r.ok) throw new Error((await r.json()).detail || 'Error');
    return r.json();
  },

  async put(path, body) {
    const r = await fetch(path, { method: 'PUT', headers: this.headers(), body: JSON.stringify(body) });
    if (r.status === 401) { Auth.logout(); return null; }
    if (!r.ok) throw new Error((await r.json()).detail || 'Error');
    return r.json();
  },

  async delete(path) {
    const r = await fetch(path, { method: 'DELETE', headers: this.headers() });
    if (r.status === 401) { Auth.logout(); return null; }
    if (!r.ok) throw new Error((await r.json()).detail || 'Error');
    return r.status === 204 ? null : r.json();
  },

  async postForm(path, formData) {
    const r = await fetch(path, { method: 'POST', headers: { 'Authorization': `Bearer ${this.token()}` }, body: formData });
    if (r.status === 401) { Auth.logout(); return null; }
    if (!r.ok) throw new Error((await r.json()).detail || 'Error');
    return r.json();
  },
};

const Auth = {
  user: () => JSON.parse(localStorage.getItem('user') || 'null'),
  isAdmin: () => Auth.user()?.role === 'admin',
  canManageUsers: () => Auth.isAdmin() || !!Auth.user()?.perm_manage_users,
  canManageDevice: () => Auth.isAdmin() || !!Auth.user()?.perm_manage_device,
  canManageSettings: () => Auth.isAdmin() || !!Auth.user()?.perm_manage_settings,
  canManageEmployees: () => Auth.isAdmin() || !!Auth.user()?.perm_manage_employees,
  canManageSchedules: () => Auth.isAdmin() || !!Auth.user()?.perm_manage_schedules,
  canExportReports: () => Auth.isAdmin() || !!Auth.user()?.perm_export_reports,
  canManageAttendance: () => Auth.isAdmin() || !!Auth.user()?.perm_manage_attendance,
  canSyncDevice: () => Auth.isAdmin() || !!Auth.user()?.perm_sync_device || !!Auth.user()?.perm_manage_device,
  canViewEmployees: () => Auth.isAdmin() || !!Auth.user()?.perm_view_employees || !!Auth.user()?.perm_manage_employees,



  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  },

  guard() {
    if (!localStorage.getItem('token')) window.location.href = '/';
  },
};

/* Toast notifications */
const Toast = {
  show(message, type = 'info', duration = 3500) {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    t.className = `toast ${type}`;
    t.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${message}</span>`;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(20px)'; t.style.transition = '.3s'; setTimeout(() => t.remove(), 300); }, duration);
  },
};

/* Modal */
const Modal = {
  open(title, bodyHTML, footerHTML = '') {
    document.getElementById('modalBox').classList.remove('modal-drawer');
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHTML;
    document.getElementById('modalFooter').innerHTML = footerHTML;
    document.getElementById('modalOverlay').classList.add('open');
  },
  openDrawer(title, bodyHTML, footerHTML = '') {
    document.getElementById('modalBox').classList.add('modal-drawer');
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHTML;
    document.getElementById('modalFooter').innerHTML = footerHTML;
    document.getElementById('modalOverlay').classList.add('open');
  },
  close() {
    document.getElementById('modalOverlay').classList.remove('open');
    setTimeout(() => {
      document.getElementById('modalBox').classList.remove('modal-drawer');
    }, 450); // wait for translateX animation to complete
    const modalEl = document.querySelector('#modalOverlay .modal');
    if (modalEl) {
      modalEl.style.maxWidth = '';
    }
    if (typeof EmployeesPage !== 'undefined' && EmployeesPage.stopWebcam) {
      EmployeesPage.stopWebcam();
    }
  },
  confirm(title, message, onConfirm, type = 'danger') {
    const colors = {
      danger: {
        iconColor: 'var(--danger)',
        btnClass: 'btn-danger',
        bgLight: 'rgba(220, 38, 38, 0.08)',
        pulseClass: 'confirm-icon-pulse'
      },
      warning: {
        iconColor: 'var(--warning)',
        btnClass: 'btn-primary',
        bgLight: 'rgba(255, 179, 0, 0.08)',
        pulseClass: 'confirm-icon-pulse warning'
      }
    };
    const style = colors[type] || colors.danger;
    const modalBox = document.getElementById('modalBox');
    
    // Configurar tamaño
    modalBox.classList.add('modal-sm');
    
    const iconHTML = `
      <div style="display:flex; justify-content:center; margin-bottom:20px;">
        <div class="${style.pulseClass}" style="width:64px; height:64px; border-radius:50%; background:${style.bgLight}; display:flex; align-items:center; justify-content:center; color:${style.iconColor}; border: 1px solid rgba(255, 255, 255, 0.1);">
          ${type === 'danger' ? `
            <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          ` : `
            <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          `}
        </div>
      </div>
    `;

    const bodyHTML = `
      ${iconHTML}
      <h3 style="font-size:1.25rem; font-weight:800; color:var(--text-1); text-align:center; margin-bottom:12px;">${title}</h3>
      <p style="font-size:0.88rem; color:var(--text-2); text-align:center; line-height:1.5; margin:0;">${message}</p>
    `;
    
    const modalHeader = document.querySelector('.modal-header');
    if (modalHeader) modalHeader.style.display = 'none';

    const footerHTML = `
      <button class="btn btn-secondary" id="btnConfirmCancel" style="flex:1;">Cancelar</button>
      <button class="btn ${style.btnClass}" id="btnConfirmAccept" style="flex:1;">Aceptar</button>
    `;

    this.open('', bodyHTML, footerHTML);

    const modalFooter = document.getElementById('modalFooter');
    modalFooter.style.display = 'flex';
    modalFooter.style.gap = '12px';
    modalFooter.style.marginTop = '24px';
    modalFooter.style.paddingTop = '16px';

    const cleanUp = () => {
      modalBox.classList.remove('modal-sm');
      if (modalHeader) modalHeader.style.display = 'flex';
      modalFooter.style.display = '';
      modalFooter.style.gap = '';
      modalFooter.style.marginTop = '';
      modalFooter.style.paddingTop = '';
    };

    document.getElementById('btnConfirmCancel').onclick = () => {
      this.close();
      cleanUp();
    };

    document.getElementById('btnConfirmAccept').onclick = async () => {
      this.close();
      cleanUp();
      if (onConfirm) await onConfirm();
    };
  },
};

// ── Avatar color helper ───────────────────────────────────────────────────────
// Genera un color bg+text consistente a partir del nombre del empleado
function avatarColor(name) {
  const palettes = [
    { bg: 'rgba(99,102,241,0.14)',  color: '#6366f1' },  // indigo
    { bg: 'rgba(14,165,233,0.14)',  color: '#0ea5e9' },  // sky
    { bg: 'rgba(16,185,129,0.14)', color: '#059669' },   // emerald
    { bg: 'rgba(245,158,11,0.14)', color: '#d97706' },   // amber
    { bg: 'rgba(239,68,68,0.14)',  color: '#dc2626' },   // red
    { bg: 'rgba(168,85,247,0.14)', color: '#9333ea' },   // purple
    { bg: 'rgba(236,72,153,0.14)', color: '#db2777' },   // pink
    { bg: 'rgba(20,184,166,0.14)', color: '#0d9488' },   // teal
  ];
  let hash = 0;
  const str = (name || '?').toUpperCase();
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palettes[Math.abs(hash) % palettes.length];
}

// Helper para generar el HTML del avatar con color dinámico
function avatarHtml(name, extraStyle = '') {
  const c = avatarColor(name);
  const initial = (name || '?').charAt(0).toUpperCase();
  return `<div class="emp-avatar" aria-hidden="true" style="background:${c.bg};color:${c.color};font-weight:700;${extraStyle}">${initial}</div>`;
}
