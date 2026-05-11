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
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHTML;
    document.getElementById('modalFooter').innerHTML = footerHTML;
    document.getElementById('modalOverlay').classList.add('open');
  },
  close() {
    document.getElementById('modalOverlay').classList.remove('open');
  },
};
